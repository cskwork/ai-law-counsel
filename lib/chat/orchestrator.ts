/**
 * 채팅 오케스트레이터
 * - LLM 호출과 도구 실행을 반복하며 최종 응답을 생성
 * - SSE 이벤트로 진행 상황을 클라이언트에 전달
 *
 * 종료 보장:
 * - LLM이 도구 없이 완성된 답변을 주면 그대로 내보낸다.
 * - "이제 조문을 조회하겠습니다" 같은 계획 문장만 주면 한 번 더 진행을 요청하고,
 *   그래도 답이 없거나 도구 한도·시간 예산에 닿으면 도구 없이 "최종 답변 작성" 턴을 강제한다.
 */
import type { ChatMessage, ToolCall, ToolDefinition, ZaiResponse } from '@/lib/zai/types';
import type { SSEEvent } from '@/lib/utils/sse';
import type { ZaiTurnDelta } from '@/lib/utils/zai-stream';
import { formatArticleLabel } from '@/lib/law/article-number';
import { isDegenerateRepetition, isPlanningMessage } from './answer-guard';
import { createSourceLedger, recordToolResult, selectCitedSources } from './sources';
import { buildSystemPrompt } from './system-prompt';

/** 도구 호출 라운드 최대 횟수 (라운드마다 여러 도구를 병렬 호출할 수 있음) */
export const MAX_TOOL_ROUNDS = 8;

/** 한 라운드에서 실행할 최대 도구 호출 수 */
const MAX_TOOL_CALLS_PER_ROUND = 6;

/** 계획 문장만 돌아왔을 때 진행을 재촉하는 최대 횟수 */
const MAX_PLANNING_NUDGES = 1;

/** 도구 단계 시간 예산 (이후에는 수집한 자료로 바로 답변 작성) */
export const TOOL_PHASE_BUDGET_MS = 150_000;

/** 도구 호출 없이 이만큼(문자) 쌓이면 실제 답변으로 보고 실시간 전달을 시작 */
const LIVE_STREAM_THRESHOLD = 280;

/** 최종 답변 최대 길이 (퇴행 출력이 끝없이 이어지는 것을 막음) */
const MAX_ANSWER_CHARS = 16_000;

/** 계획 문장만 보냈을 때 LLM에게 주는 재촉 */
const CONTINUE_NUDGE =
  '방금 메시지는 계획만 말하고 끝났습니다. 더 확인할 자료가 있으면 지금 바로 도구를 호출하고, 충분하면 계획 문장 없이 완성된 최종 답변을 작성하세요.';

/** 최종 답변 강제 지시 (도구 없이 호출) */
const FINAL_SYNTHESIS_INSTRUCTION = `이제 도구를 더 사용할 수 없습니다. 지금까지 도구로 확인한 법령·판례만 근거로 사용자 질문에 대한 최종 답변을 지금 바로 작성하세요.
- "~하겠습니다", "조회하겠습니다" 같은 계획이나 예고 문장은 쓰지 마세요.
- 시스템 지침의 답변 구성(한눈에 보기, 관련 법령, 대처 방법과 기한, 관련 판례, 주의할 점)을 따르세요.
- 확인하지 못한 내용은 "확인이 필요합니다"라고 밝히고 추측하지 마세요.
- 마지막 줄에는 면책 문구를 넣으세요.`;

/** 최종 답변 생성 실패 시 사용자에게 보여줄 안내 */
const ANSWER_FAILURE_NOTICE =
  '죄송합니다. 자료는 찾았지만 답변을 완성하지 못했습니다. 잠시 후 같은 질문을 다시 보내 주세요.';

/** 반복 출력 감지 시 덧붙이는 안내 */
const DEGENERATE_NOTICE = '\n\n(답변 생성이 비정상적으로 반복되어 중단했습니다. 같은 질문을 다시 보내 주세요.)';

/** 오케스트레이터 외부 의존성 (테스트 용이성을 위한 DI) */
export interface OrchestratorDeps {
  zaiComplete: (messages: ChatMessage[], tools: ToolDefinition[]) => Promise<ZaiResponse>;
  zaiStream?: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<string>;
  /** 도구를 쓸 수 있는 턴의 스트리밍 (content + tool_call 조각) */
  zaiStreamTurn?: (messages: ChatMessage[], tools: ToolDefinition[]) => AsyncGenerator<ZaiTurnDelta>;
  executeTool: (toolName: string, argsJson: string) => Promise<string>;
  /** 법률 도구 + clarify_situation */
  tools: ToolDefinition[];
  /** 현재 시각 (테스트에서 시간 예산 검증용) */
  now?: () => number;
}

/**
 * 채팅 오케스트레이션 메인 함수
 * - 시스템 프롬프트 + 사용자 메시지로 LLM 호출
 * - 도구 호출이 있으면 실행 후 재호출 (최대 MAX_TOOL_ROUNDS 라운드)
 * - clarify_situation은 사용자에게 직접 질문 전달 후 종료
 * - 어떤 경로로 끝나든 계획 문장이 아닌 최종 답변을 내보낸다
 */
export async function orchestrateChat(
  userMessages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  deps: OrchestratorDeps,
): Promise<void> {
  const now = deps.now ?? Date.now;
  const startedAt = now();
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(new Date()) },
    ...userMessages,
  ];

  const ledger = createSourceLedger();
  let answer: string | undefined;
  let nudges = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (round > 0 && now() - startedAt > TOOL_PHASE_BUDGET_MS) break;

    const turn = await runTurn(messages, emit, deps);

    // LLM 응답이 비어있는 경우
    if (!turn) {
      emit({ type: 'error', message: 'LLM 응답이 비어있습니다' });
      emit({ type: 'done' });
      return;
    }

    const toolCalls = turn.toolCalls
      .filter((call) => Boolean(call?.function?.name))
      .slice(0, MAX_TOOL_CALLS_PER_ROUND)
      .map((call, index): ToolCall => ({
        id: call.id || `call_${round}_${index}`,
        type: 'function',
        function: { name: call.function.name, arguments: call.function.arguments || '{}' },
      }));

    // 도구 호출 없음 -> 완성된 답변이면 전달, 계획 문장이면 진행 재촉
    if (toolCalls.length === 0) {
      const content = turn.content.trim();
      if (turn.emitted) {
        // 스트리밍으로 이미 사용자에게 전달된 답변
        answer = turn.content;
        break;
      }

      const degenerate = isDegenerateRepetition(content);
      if (!degenerate && !isPlanningMessage(content)) {
        answer = content;
        emit({ type: 'content', content });
        break;
      }

      if (content && !degenerate) messages.push({ role: 'assistant', content });
      if (nudges < MAX_PLANNING_NUDGES) {
        nudges++;
        messages.push({ role: 'user', content: CONTINUE_NUDGE });
        continue;
      }
      break;
    }

    // assistant 메시지에 도구 호출 기록을 함께 남겨야 뒤따르는 tool 메시지가 짝을 이룬다
    messages.push({
      role: 'assistant',
      content: turn.content,
      tool_calls: toolCalls,
    });

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
      recordToolResult(ledger, name, result);

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
  }

  // 완성된 답변이 없으면 도구 없이 최종 답변 턴을 강제
  if (answer === undefined) {
    answer = await synthesizeFinalAnswer(messages, emit, deps);
  }

  const sources = selectCitedSources(answer, ledger);
  emit({
    type: 'done',
    ...(sources.length > 0 ? { sources } : {}),
  });
}

/** 한 번의 LLM 턴 결과 */
interface TurnResult {
  readonly content: string;
  readonly toolCalls: ToolCall[];
  /** 스트리밍 중 content를 이미 사용자에게 내보냈는지 */
  readonly emitted: boolean;
}

/**
 * 도구를 쓸 수 있는 LLM 턴 1회 실행
 * - 스트리밍 가능 시: content를 모아 두다가 도구 호출 없이 충분히 길어지면(= 실제 답변) 그때부터 실시간 전달.
 *   짧은 계획 문장이나 도구 호출 전 머리말은 사용자에게 보내지 않는다.
 * - 스트리밍 불가 시: 비스트리밍 응답을 그대로 돌려준다.
 * @returns 응답 메시지가 없으면 undefined
 */
async function runTurn(
  messages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  deps: OrchestratorDeps,
): Promise<TurnResult | undefined> {
  if (!deps.zaiStreamTurn) {
    const response = await deps.zaiComplete(messages, deps.tools);
    const message = response.choices?.[0]?.message;
    if (!message) return undefined;
    return { content: message.content ?? '', toolCalls: message.tool_calls ?? [], emitted: false };
  }

  let content = '';
  let live = false;
  const calls = new Map<number, { id: string; name: string; arguments: string }>();

  for await (const delta of deps.zaiStreamTurn(messages, deps.tools)) {
    if (delta.type === 'tool_call') {
      const call = calls.get(delta.index) ?? { id: '', name: '', arguments: '' };
      calls.set(delta.index, {
        id: delta.id || call.id,
        name: delta.name || call.name,
        arguments: call.arguments + (delta.arguments ?? ''),
      });
      continue;
    }

    content += delta.text;
    if (live) {
      emit({ type: 'content', content: delta.text });
      if (isDegenerateRepetition(content) || content.length > MAX_ANSWER_CHARS) {
        emit({ type: 'content', content: DEGENERATE_NOTICE });
        content += DEGENERATE_NOTICE;
        break;
      }
    } else if (
      calls.size === 0
      && content.trim().length >= LIVE_STREAM_THRESHOLD
      && !isPlanningMessage(content)
      && !isDegenerateRepetition(content)
    ) {
      live = true;
      emit({ type: 'content', content });
    }
  }

  const toolCalls: ToolCall[] = Array.from(calls.entries())
    .sort(([a], [b]) => a - b)
    .map(([, call]) => ({ id: call.id, type: 'function', function: { name: call.name, arguments: call.arguments } }));

  if (!live && !content && toolCalls.length === 0) return undefined;
  return { content, toolCalls, emitted: live };
}

/**
 * 수집한 자료로 최종 답변을 작성하게 한다 (도구 없이 호출)
 * - 스트리밍이 가능하면 토큰 단위로 전달하고, 반복 퇴행·과도한 길이는 중단한다
 * @returns 사용자에게 전달된 최종 답변 텍스트
 */
async function synthesizeFinalAnswer(
  messages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  deps: OrchestratorDeps,
): Promise<string> {
  const finalMessages: ChatMessage[] = [
    ...messages,
    { role: 'user', content: FINAL_SYNTHESIS_INSTRUCTION },
  ];

  if (deps.zaiStream) {
    let text = '';
    for await (const chunk of deps.zaiStream(finalMessages, [])) {
      text += chunk;
      emit({ type: 'content', content: chunk });

      if (isDegenerateRepetition(text) || text.length > MAX_ANSWER_CHARS) {
        emit({ type: 'content', content: DEGENERATE_NOTICE });
        return text + DEGENERATE_NOTICE;
      }
    }

    if (!text.trim()) {
      emit({ type: 'content', content: ANSWER_FAILURE_NOTICE });
      return ANSWER_FAILURE_NOTICE;
    }
    return text;
  }

  const response = await deps.zaiComplete(finalMessages, []);
  const content = (response.choices?.[0]?.message?.content ?? '').trim();
  const finalText = isPlanningMessage(content) ? ANSWER_FAILURE_NOTICE : content;
  emit({ type: 'content', content: finalText });
  return finalText;
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
export function summarizeToolResult(toolName: string, result: string): string {
  try {
    const parsed = JSON.parse(result) as Record<string, unknown>;

    if (toolName === 'search_law_articles' && 'totalCount' in parsed) {
      return `관련 조문 ${parsed.totalCount}건`;
    }
    if ('totalCount' in parsed) {
      return `${parsed.totalCount}건 발견`;
    }
    if ('lawNameKo' in parsed) {
      const articles = Array.isArray(parsed.articles) ? parsed.articles as Array<Record<string, unknown>> : [];
      const labels = articles
        .filter((article) => article.articleContent)
        .map((article) => formatArticleLabel(String(article.articleNumber ?? '')))
        .filter(Boolean);
      return labels.length > 0
        ? `${parsed.lawNameKo} ${labels.join('·')} 조회 완료`
        : `${parsed.lawNameKo} 조회 완료`;
    }
    if ('caseName' in parsed) {
      return `${parsed.caseName} 조회 완료`;
    }
    return '조회 완료';
  } catch {
    return result.startsWith('도구 실행 오류') ? '조회 실패' : result.slice(0, 50);
  }
}
