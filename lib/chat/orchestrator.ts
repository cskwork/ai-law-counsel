/**
 * 채팅 오케스트레이터
 * - LLM 호출과 도구 실행을 반복하며 최종 응답을 생성
 * - SSE 이벤트로 진행 상황을 클라이언트에 전달
 */
import type { ChatMessage, ToolDefinition, ZaiResponse } from '@/lib/zai/types';
import type { SSEEvent } from '@/lib/utils/sse';
import { LAW_TOOLS } from '@/lib/zai/tools-schema';
import { SYSTEM_PROMPT } from './system-prompt';

/** 도구 호출 최대 반복 횟수 */
const MAX_TOOL_ROUNDS = 5;

/** 오케스트레이터 외부 의존성 (테스트 용이성을 위한 DI) */
export interface OrchestratorDeps {
  zaiComplete: (messages: ChatMessage[], tools: ToolDefinition[]) => Promise<ZaiResponse>;
  zaiStream?: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<string>;
  executeTool: (toolName: string, argsJson: string) => Promise<string>;
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

  let toolRounds = 0;

  while (toolRounds <= MAX_TOOL_ROUNDS) {
    const response = await deps.zaiComplete(messages, LAW_TOOLS);
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

    // 도구 호출 횟수 초과
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      emit({
        type: 'content',
        content: '수집된 정보를 기반으로 답변드립니다. 추가적인 법령 검색이 필요할 수 있습니다.',
      });
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

  emit({ type: 'done' });
}

/** 최종 답변을 스트리밍으로 전송 */
async function streamFinalResponse(
  messages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  zaiStream: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<string>,
): Promise<void> {
  for await (const chunk of zaiStream(messages, LAW_TOOLS)) {
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
