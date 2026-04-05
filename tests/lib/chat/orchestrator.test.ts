/**
 * 채팅 오케스트레이터 단위 테스트
 * - 도구 호출 없는 직접 응답, 도구 호출 루프, 최대 라운드 제한, clarify_situation 처리
 */
import { describe, it, expect, vi } from 'vitest';
import { orchestrateChat, type OrchestratorDeps } from '@/lib/chat/orchestrator';
import type { SSEEvent } from '@/lib/utils/sse';

/** 모의 의존성 생성 헬퍼 */
function createMockDeps(responses: Array<{
  content?: string | null;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}>): OrchestratorDeps {
  let callIndex = 0;

  return {
    zaiComplete: vi.fn().mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: resp?.content ?? null,
              tool_calls: resp?.toolCalls?.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            },
            finish_reason: resp?.toolCalls ? 'tool_calls' : 'stop',
          },
        ],
      };
    }),
    executeTool: vi.fn().mockResolvedValue('{"totalCount":1,"items":[]}'),
  };
}

describe('orchestrateChat', () => {
  it('도구 호출 없이 직접 응답을 반환한다', async () => {
    const deps = createMockDeps([{ content: '안녕하세요!' }]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '안녕' }],
      (e) => events.push(e),
      deps,
    );

    expect(events).toContainEqual({ type: 'content', content: '안녕하세요!' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('도구 호출 실행 후 LLM을 재호출하여 최종 답변을 생성한다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          { id: 'call_1', name: 'search_law', arguments: '{"query":"임대차"}' },
        ],
      },
      { content: '주택임대차보호법에 따르면...' },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차법 알려줘' }],
      (e) => events.push(e),
      deps,
    );

    // 도구 호출 이벤트 확인
    expect(events.some((e) => e.type === 'tool_call' && e.name === 'search_law')).toBe(true);
    // 도구 결과 이벤트 확인
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    // 최종 콘텐츠 이벤트 확인
    expect(events.some((e) => e.type === 'content')).toBe(true);
    // executeTool이 올바른 인자로 호출되었는지 확인
    expect(deps.executeTool).toHaveBeenCalledWith('search_law', '{"query":"임대차"}');
  });

  it('최대 5라운드 도구 호출 후 중단한다', async () => {
    // 6개 응답: 5라운드 도구 호출 + 6번째에서 MAX_TOOL_ROUNDS 초과 처리
    const infiniteToolCalls = Array.from({ length: 6 }, () => ({
      toolCalls: [
        { id: 'call_x', name: 'search_law', arguments: '{"query":"test"}' },
      ],
    }));
    const deps = createMockDeps(infiniteToolCalls);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: 'test' }],
      (e) => events.push(e),
      deps,
    );

    // zaiComplete는 6번 호출 (0~4 라운드 실행 + 5번째에서 초과 감지)
    expect(deps.zaiComplete).toHaveBeenCalledTimes(6);
    // 초과 안내 메시지 확인
    expect(
      events.some((e) => e.type === 'content' && e.content?.includes('수집된 정보')),
    ).toBe(true);
  });

  it('clarify_situation 호출 시 질문을 사용자에게 전달하고 종료한다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          {
            id: 'call_1',
            name: 'clarify_situation',
            arguments: '{"question":"계약 기간은?"}',
          },
        ],
      },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차 문제가 있어요' }],
      (e) => events.push(e),
      deps,
    );

    // 질문이 content 이벤트로 전달되는지 확인
    expect(
      events.some((e) => e.type === 'content' && e.content?.includes('계약 기간은?')),
    ).toBe(true);
    // done 이벤트로 종료 확인
    expect(events[events.length - 1]).toEqual({ type: 'done' });
    // executeTool은 clarify_situation에서 호출되지 않음
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it('LLM 응답이 비어있으면 에러 이벤트를 발생시킨다', async () => {
    const deps: OrchestratorDeps = {
      zaiComplete: vi.fn().mockResolvedValue({ choices: [{}] }),
      executeTool: vi.fn(),
    };
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: 'test' }],
      (e) => events.push(e),
      deps,
    );

    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('도구 결과에 totalCount가 있으면 건수 요약을 생성한다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          { id: 'call_1', name: 'search_law', arguments: '{"query":"민법"}' },
        ],
      },
      { content: '민법 관련 결과입니다.' },
    ]);
    deps.executeTool = vi.fn().mockResolvedValue('{"totalCount":5,"items":[]}');
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '민법 검색' }],
      (e) => events.push(e),
      deps,
    );

    const toolResultEvent = events.find((e) => e.type === 'tool_result');
    expect(toolResultEvent?.summary).toBe('5건 발견');
  });

  it('도구 결과에 lawNameKo가 있으면 법령명 요약을 생성한다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          { id: 'call_1', name: 'get_law_detail', arguments: '{"lawId":"123"}' },
        ],
      },
      { content: '결과입니다.' },
    ]);
    deps.executeTool = vi.fn().mockResolvedValue('{"lawNameKo":"민법"}');
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '민법 상세' }],
      (e) => events.push(e),
      deps,
    );

    const toolResultEvent = events.find((e) => e.type === 'tool_result');
    expect(toolResultEvent?.summary).toBe('민법 조회 완료');
  });
});
