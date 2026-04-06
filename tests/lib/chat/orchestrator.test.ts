/**
 * 채팅 오케스트레이터 단위 테스트
 * - 도구 호출 없는 직접 응답, 도구 호출 루프, 최대 라운드 제한, clarify_situation 처리
 */
import { describe, it, expect, vi } from 'vitest';
import { orchestrateChat, extractSources, deduplicateSources, type OrchestratorDeps } from '@/lib/chat/orchestrator';
import type { SSEEvent } from '@/lib/utils/sse';
import { CLARIFY_TOOL } from '@/lib/zai/tools-schema';

/** 테스트용 도구 목록 */
const TEST_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_law',
      description: '법령 검색',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  CLARIFY_TOOL,
];

/** 모의 의존성 생성 헬퍼 */
function createMockDeps(responses: Array<{
  content?: string | null;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}>): OrchestratorDeps {
  let callIndex = 0;

  return {
    tools: TEST_TOOLS,
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

    expect(events.some((e) => e.type === 'tool_call' && e.name === 'search_law')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    expect(events.some((e) => e.type === 'content')).toBe(true);
    expect(deps.executeTool).toHaveBeenCalledWith('search_law', '{"query":"임대차"}');
  });

  it('최대 5라운드 도구 호출 후 중단한다', async () => {
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

    expect(deps.zaiComplete).toHaveBeenCalledTimes(6);
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

    expect(
      events.some((e) => e.type === 'content' && e.content?.includes('계약 기간은?')),
    ).toBe(true);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it('LLM 응답이 비어있으면 에러 이벤트를 발생시킨다', async () => {
    const deps: OrchestratorDeps = {
      tools: TEST_TOOLS,
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

  it('도구 호출 후 done 이벤트에 sources가 포함된다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          { id: 'call_1', name: 'search_law', arguments: '{"query":"임대차"}' },
        ],
      },
      { content: '결과입니다.' },
    ]);
    deps.executeTool = vi.fn().mockResolvedValue(
      '{"totalCount":1,"items":[{"lawNameKo":"주택임대차보호법","lawId":"14450"}]}',
    );
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차법' }],
      (e) => events.push(e),
      deps,
    );

    const doneEvent = events[events.length - 1];
    expect(doneEvent.type).toBe('done');
    expect(doneEvent.sources).toBeDefined();
    expect(doneEvent.sources).toHaveLength(1);
    expect(doneEvent.sources![0]).toMatchObject({
      type: 'law',
      name: '주택임대차보호법',
      identifier: '14450',
    });
    expect(doneEvent.sources![0].url).toContain('law.go.kr');
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

describe('extractSources', () => {
  it('search_law 결과에서 법령 출처를 추출한다', () => {
    const result = JSON.stringify({
      totalCount: 2,
      items: [
        { lawNameKo: '민법', lawId: '10101' },
        { lawNameKo: '상법', lawId: '10102' },
      ],
    });
    const sources = extractSources('search_law', result);
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ type: 'law', name: '민법', identifier: '10101' });
    expect(sources[0].url).toContain('law.go.kr');
    expect(sources[1]).toMatchObject({ type: 'law', name: '상법', identifier: '10102' });
  });

  it('get_law_detail 결과에서 법령 출처를 추출한다', () => {
    const result = JSON.stringify({ lawNameKo: '민법', lawId: '10101', articles: [] });
    const sources = extractSources('get_law_detail', result);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ type: 'law', name: '민법' });
  });

  it('search_precedent 결과에서 판례 출처를 추출한다', () => {
    const result = JSON.stringify({
      totalCount: 1,
      items: [{ caseName: '사기 사건', caseNumber: '2023다12345' }],
    });
    const sources = extractSources('search_precedent', result);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ type: 'precedent', name: '사기 사건', identifier: '2023다12345' });
    expect(sources[0].url).toBeUndefined();
  });

  it('잘못된 JSON이면 빈 배열을 반환한다', () => {
    expect(extractSources('search_law', 'not json')).toEqual([]);
  });

  it('최대 10건까지만 추출한다', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      lawNameKo: `법령${i}`,
      lawId: `${i}`,
    }));
    const result = JSON.stringify({ totalCount: 15, items });
    const sources = extractSources('search_law', result);
    expect(sources).toHaveLength(10);
  });
});

describe('deduplicateSources', () => {
  it('동일한 type+identifier 출처를 중복 제거한다', () => {
    const sources = [
      { type: 'law' as const, name: '민법', identifier: '10101', url: 'a' },
      { type: 'law' as const, name: '민법', identifier: '10101', url: 'a' },
      { type: 'precedent' as const, name: '사건', identifier: '2023다1' },
    ];
    const result = deduplicateSources(sources);
    expect(result).toHaveLength(2);
  });
});
