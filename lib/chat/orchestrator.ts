/**
 * 채팅 오케스트레이터
 * - LLM 호출과 도구 실행을 반복하며 최종 응답을 생성
 * - SSE 이벤트로 진행 상황을 클라이언트에 전달
 */
import type { ChatMessage, ToolDefinition, ZaiResponse } from '@/lib/zai/types';
import type { SSEEvent, SourceItem } from '@/lib/utils/sse';
import { buildExternalUrl } from '@/lib/citation/builder';
import type { CitationType } from '@/lib/citation/types';
import { SYSTEM_PROMPT } from './system-prompt';

/** 도구 호출 최대 반복 횟수 */
const MAX_TOOL_ROUNDS = 10;

/** 도구 호출 한도 초과 시 LLM에게 전달하는 안내 메시지 */
const TOOL_LIMIT_GUIDE =
  '도구 호출 한도에 도달했습니다. 지금까지 수집된 정보만을 기반으로 최종 답변을 생성하세요. 추가 검색이 필요한 부분이 있다면 답변에 그 점을 명시하세요.';

/** 오케스트레이터 외부 의존성 (테스트 용이성을 위한 DI) */
export interface OrchestratorDeps {
  zaiComplete: (messages: ChatMessage[], tools: ToolDefinition[]) => Promise<ZaiResponse>;
  zaiStream?: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<string>;
  executeTool: (toolName: string, argsJson: string) => Promise<string>;
  /** MCP에서 가져온 법률 도구 + clarify_situation */
  tools: ToolDefinition[];
}

/**
 * 채팅 오케스트레이션 메인 함수
 * - 시스템 프롬프트 + 사용자 메시지로 LLM 호출
 * - 도구 호출이 있으면 실행 후 재호출 (최대 MAX_TOOL_ROUNDS회)
 * - clarify_situation은 사용자에게 직접 질문 전달 후 종료
 */
export async function orchestrateChat(
  userMessages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  deps: OrchestratorDeps,
): Promise<void> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
  ];

  const collectedSources: SourceItem[] = [];
  let toolRounds = 0;

  while (toolRounds <= MAX_TOOL_ROUNDS) {
    const response = await deps.zaiComplete(messages, deps.tools);
    const choice = response.choices[0];
    const message = choice?.message;

    // LLM 응답이 비어있는 경우
    if (!message) {
      emit({ type: 'error', message: 'LLM 응답이 비어있습니다' });
      break;
    }

    const toolCalls = message.tool_calls;

    // 도구 호출 없음 -> 최종 답변 (스트리밍 가능)
    if (!toolCalls || toolCalls.length === 0) {
      if (deps.zaiStream) {
        // 스트리밍 재요청으로 토큰 단위 전송
        await streamFinalResponse(messages, emit, deps.zaiStream);
      } else if (message.content) {
        emit({ type: 'content', content: message.content });
      }
      break;
    }

    // 도구 호출 횟수 초과 -> 수집된 정보로 최종 답변 생성
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      messages.push({ role: 'system', content: TOOL_LIMIT_GUIDE });

      if (deps.zaiStream) {
        await streamFinalResponse(messages, emit, deps.zaiStream);
      } else {
        const finalResponse = await deps.zaiComplete(messages, []);
        const finalContent = finalResponse.choices[0]?.message?.content;
        if (finalContent) {
          emit({ type: 'content', content: finalContent });
        }
      }
      break;
    }

    // assistant 메시지에 도구 호출 기록 추가
    messages.push({
      role: 'assistant',
      content: message.content ?? '',
    });

    // 각 도구 호출 실행
    for (const toolCall of toolCalls) {
      const { name, arguments: argsJson } = toolCall.function;

      emit({
        type: 'tool_call',
        name,
        args: safeParseJson(argsJson),
      });

      // clarify_situation은 사용자에게 직접 질문 전달
      if (name === 'clarify_situation') {
        const parsed = safeParseJson(argsJson);
        const question = String(parsed?.question ?? '추가 정보가 필요합니다.');
        emit({ type: 'content', content: question });
        emit({ type: 'done' });
        return;
      }

      const result = await deps.executeTool(name, argsJson);

      collectedSources.push(...extractSources(name, result));

      emit({
        type: 'tool_result',
        name,
        summary: summarizeToolResult(name, result),
      });

      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    toolRounds++;
  }

  const dedupedSources = deduplicateSources(collectedSources);
  emit({
    type: 'done',
    ...(dedupedSources.length > 0 ? { sources: dedupedSources } : {}),
  });
}

/** 최종 답변을 스트리밍으로 전송 */
async function streamFinalResponse(
  messages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  zaiStream: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<string>,
): Promise<void> {
  for await (const chunk of zaiStream(messages, [])) {
    emit({ type: 'content', content: chunk });
  }
}

/** JSON 문자열을 안전하게 파싱 */
function safeParseJson(json: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** 최대 출처 수집 수 (검색 결과 당) */
const MAX_SOURCES_PER_RESULT = 10;

/** 법령은 이름 기반 URL이 항상 유효 */
function buildLawUrl(lawName: string): string {
  return buildExternalUrl('statute' as CitationType, lawName);
}

/** 도구 결과에서 출처 정보 추출 */
export function extractSources(toolName: string, result: string): SourceItem[] {
  try {
    const parsed = JSON.parse(result) as Record<string, unknown>;
    const sources: SourceItem[] = [];

    if (toolName === 'search_law' && Array.isArray(parsed.items)) {
      for (const item of parsed.items.slice(0, MAX_SOURCES_PER_RESULT)) {
        if (item.lawNameKo && item.lawId) {
          const name = String(item.lawNameKo);
          sources.push({ type: 'law', name, identifier: String(item.lawId), url: buildLawUrl(name) });
        }
      }
    } else if (toolName === 'get_law_detail' && parsed.lawNameKo && parsed.lawId) {
      const name = String(parsed.lawNameKo);
      sources.push({ type: 'law', name, identifier: String(parsed.lawId), url: buildLawUrl(name) });
    } else if (toolName === 'search_precedent' && Array.isArray(parsed.items)) {
      for (const item of parsed.items.slice(0, MAX_SOURCES_PER_RESULT)) {
        if (item.caseName && item.caseNumber) {
          sources.push({ type: 'precedent', name: String(item.caseName), identifier: String(item.caseNumber) });
        }
      }
    } else if (toolName === 'get_precedent_detail' && parsed.caseName && parsed.caseNumber) {
      sources.push({ type: 'precedent', name: String(parsed.caseName), identifier: String(parsed.caseNumber) });
    } else if (toolName === 'search_administrative_rule' && Array.isArray(parsed.items)) {
      for (const item of parsed.items.slice(0, MAX_SOURCES_PER_RESULT)) {
        if (item.adminRuleName && item.adminRuleId) {
          sources.push({ type: 'admin_rule', name: String(item.adminRuleName), identifier: String(item.adminRuleId) });
        }
      }
    }

    return sources;
  } catch {
    return [];
  }
}

/** 중복 출처 제거 (type+identifier 기준) */
export function deduplicateSources(sources: readonly SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.type}:${s.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 도구 결과를 사용자 표시용으로 요약 */
function summarizeToolResult(toolName: string, result: string): string {
  try {
    const parsed = JSON.parse(result) as Record<string, unknown>;
    if ('totalCount' in parsed) {
      return `${parsed.totalCount}건 발견`;
    }
    if ('lawNameKo' in parsed) {
      return `${parsed.lawNameKo} 조회 완료`;
    }
    if ('caseName' in parsed) {
      return `${parsed.caseName} 조회 완료`;
    }
    return '조회 완료';
  } catch {
    return result.slice(0, 50);
  }
}
