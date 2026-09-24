/**
 * 채팅 오케스트레이터 단위 테스트
 * - 도구 호출 없는 직접 응답, 도구 호출 루프, 최대 라운드 제한, clarify_situation 처리
 */
import { describe, it, expect, vi } from 'vitest';
import { orchestrateChat, MAX_TOOL_ROUNDS, TOOL_PHASE_BUDGET_MS, type OrchestratorDeps } from '@/lib/chat/orchestrator';
import type { ChatMessage } from '@/lib/zai/types';
import type { ZaiTurnDelta } from '@/lib/utils/zai-stream';
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

  it('도구 호출 한도에 닿으면 도구 없이 최종 답변 턴을 강제한다 (비스트리밍)', async () => {
    const toolCallResponses = Array.from({ length: MAX_TOOL_ROUNDS }, (_, i) => ({
      toolCalls: [
        { id: `call_${i}`, name: 'search_law', arguments: '{"query":"test"}' },
      ],
    }));
    const finalAnswer = { content: '종합하면, 관련 법령에 따르면...' };
    const deps = createMockDeps([...toolCallResponses, finalAnswer]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: 'test' }],
      (e) => events.push(e),
      deps,
    );

    // 한도만큼 도구 라운드 + 1회 최종 답변
    expect(deps.zaiComplete).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    const lastCall = (deps.zaiComplete as ReturnType<typeof vi.fn>).mock.calls[MAX_TOOL_ROUNDS];
    // 마지막 호출은 빈 도구 배열 + 최종 답변 지시
    expect(lastCall[1]).toEqual([]);
    const lastMessages = lastCall[0] as ChatMessage[];
    expect(lastMessages[lastMessages.length - 1].content).toContain('최종 답변');
    expect(
      events.some((e) => e.type === 'content' && e.content?.includes('종합하면')),
    ).toBe(true);
    expect(events[events.length - 1].type).toBe('done');
  });

  it('도구 호출 한도에 닿으면 스트리밍으로 최종 답변을 생성한다', async () => {
    const toolCallResponses = Array.from({ length: MAX_TOOL_ROUNDS }, (_, i) => ({
      toolCalls: [
        { id: `call_${i}`, name: 'search_law', arguments: '{"query":"test"}' },
      ],
    }));
    const deps = createMockDeps(toolCallResponses);

    const streamedChunks = ['종합적으로 ', '판단하면...'];
    deps.zaiStream = vi.fn().mockImplementation(async function* () {
      for (const chunk of streamedChunks) {
        yield chunk;
      }
    });
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: 'test' }],
      (e) => events.push(e),
      deps,
    );

    expect(deps.zaiComplete).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(deps.zaiStream).toHaveBeenCalledTimes(1);
    expect((deps.zaiStream as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual([]);
    expect(
      events.some((e) => e.type === 'content' && e.content === '종합적으로 '),
    ).toBe(true);
    expect(
      events.some((e) => e.type === 'content' && e.content === '판단하면...'),
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

  it('done 이벤트의 sources에는 답변이 실제로 인용한, 도구로 조회한 자료만 담긴다', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [
          { id: 'call_1', name: 'search_law', arguments: '{"query":"주택임대차보호법"}' },
          { id: 'call_2', name: 'search_precedent', arguments: '{"query":"임대차보증금"}' },
        ],
      },
      { content: '[주택임대차보호법 제3조](cite:statute/주택임대차보호법/3)에 따라 대항력이 생깁니다.' },
    ]);
    deps.executeTool = vi.fn().mockImplementation(async (name: string) =>
      name === 'search_law'
        ? '{"totalCount":1,"items":[{"lawNameKo":"주택임대차보호법","lawId":"001248"}]}'
        : '{"totalCount":2,"items":[{"precedentId":"1","caseNumber":"2023다1","caseName":"보증금"},{"precedentId":"2","caseNumber":"2023다2","caseName":"보증금"}]}',
    );
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차법' }],
      (e) => events.push(e),
      deps,
    );

    const doneEvent = events[events.length - 1];
    expect(doneEvent.type).toBe('done');
    // 검색만 되고 답변에 인용되지 않은 판례 2건은 출처가 아니다
    expect(doneEvent.sources).toEqual([
      expect.objectContaining({ type: 'law', name: '주택임대차보호법 제3조' }),
    ]);
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

describe('orchestrateChat - 최종 답변 보장', () => {
  const PLANNING = '판례 확인이 완료되었습니다. 이제 핵심 법조문인 근로기준법의 해고 제한 조항과 구제 절차 조항을 상세 조회하겠습니다.';
  const FINAL = '## 한눈에 보기\n부당해고등이 있었던 날부터 3개월 이내에 노동위원회에 구제신청을 하세요([근로기준법 제28조](cite:statute/근로기준법/28)).';

  function contentOf(events: SSEEvent[]): string {
    return events.filter((e) => e.type === 'content').map((e) => e.content).join('');
  }

  it('도구 호출과 결과가 assistant.tool_calls ↔ tool.tool_call_id로 짝지어 다음 호출에 전달된다', async () => {
    const snapshots: ChatMessage[][] = [];
    const deps = createMockDeps([
      { content: '검색하겠습니다.', toolCalls: [{ id: 'call_a', name: 'search_law', arguments: '{"query":"근로기준법"}' }] },
      { content: FINAL },
    ]);
    const complete = deps.zaiComplete;
    deps.zaiComplete = vi.fn(async (messages: ChatMessage[], tools) => {
      snapshots.push(messages.map((m) => ({ ...m })));
      return complete(messages, tools);
    });

    await orchestrateChat([{ role: 'user', content: '부당해고' }], () => undefined, deps);

    const second = snapshots[1];
    const assistant = second.find((m) => m.role === 'assistant');
    const tool = second.find((m) => m.role === 'tool');
    expect(assistant?.tool_calls?.[0]).toMatchObject({ id: 'call_a', function: { name: 'search_law' } });
    expect(tool?.tool_call_id).toBe('call_a');
    expect(second[0].content).toContain('오늘 날짜');
  });

  it('계획 문장만 돌아오면 사용자에게 보내지 않고 진행을 재촉해 실제 답변을 받는다', async () => {
    const deps = createMockDeps([
      { content: PLANNING },
      { toolCalls: [{ id: 'call_1', name: 'search_law', arguments: '{"query":"근로기준법"}' }] },
      { content: FINAL },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '부당해고 대처 방법은?' }], (e) => events.push(e), deps);

    expect(contentOf(events)).toBe(FINAL);
    expect(contentOf(events)).not.toContain('조회하겠습니다');
    const nudgeCall = (deps.zaiComplete as ReturnType<typeof vi.fn>).mock.calls[1][0] as ChatMessage[];
    expect(nudgeCall.some((m) => m.role === 'user' && m.content.includes('계획만 말하고'))).toBe(true);
  });

  it('재촉 후에도 계획 문장뿐이면 도구 없이 최종 답변을 강제한다', async () => {
    const deps = createMockDeps([
      { content: PLANNING },
      { content: '추가로 확인하겠습니다.' },
      { content: FINAL },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '부당해고 대처 방법은?' }], (e) => events.push(e), deps);

    const calls = (deps.zaiComplete as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[2][1]).toEqual([]);
    expect(contentOf(events)).toBe(FINAL);
  });

  it('강제한 최종 답변마저 계획 문장이면 계획 문장 대신 실패 안내를 보여준다', async () => {
    const deps = createMockDeps([{ content: PLANNING }, { content: PLANNING }, { content: PLANNING }]);
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '부당해고 대처 방법은?' }], (e) => events.push(e), deps);

    expect(contentOf(events)).not.toContain('조회하겠습니다');
    expect(contentOf(events)).toContain('다시 보내 주세요');
    expect(events[events.length - 1].type).toBe('done');
  });

  it('시간 예산을 넘기면 남은 라운드를 쓰지 않고 최종 답변으로 넘어간다', async () => {
    const responses = Array.from({ length: MAX_TOOL_ROUNDS }, (_, i) => ({
      toolCalls: [{ id: `call_${i}`, name: 'search_law', arguments: '{"query":"x"}' }],
    }));
    const deps = createMockDeps([...responses.slice(0, 1), { content: FINAL }]);
    let clock = 0;
    deps.now = () => clock;
    deps.executeTool = vi.fn().mockImplementation(async () => {
      clock += TOOL_PHASE_BUDGET_MS + 1;
      return '{"totalCount":0,"items":[]}';
    });
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: 'x' }], (e) => events.push(e), deps);

    const calls = (deps.zaiComplete as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][1]).toEqual([]);
    expect(contentOf(events)).toBe(FINAL);
  });

  it('최종 답변 스트림이 같은 단어 반복으로 퇴행하면 중단하고 안내를 붙인다', async () => {
    const deps = createMockDeps([{ content: PLANNING }, { content: PLANNING }]);
    let yielded = 0;
    deps.zaiStream = vi.fn().mockImplementation(async function* () {
      yield '핵심 조문을 확인했습니다.';
      for (let i = 0; i < 5000; i++) {
        yielded++;
        yield ' Kavanaugh';
      }
    });
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: 'x' }], (e) => events.push(e), deps);

    expect(yielded).toBeLessThan(200);
    expect(contentOf(events)).toContain('비정상적으로 반복');
    expect(events[events.length - 1].type).toBe('done');
  });
});

describe('orchestrateChat - 스트리밍 턴', () => {
  function streamTurns(turns: ZaiTurnDelta[][]) {
    let index = 0;
    return vi.fn().mockImplementation(async function* () {
      for (const delta of turns[index++] ?? []) yield delta;
    });
  }

  it('도구 호출 전 머리말은 숨기고, 도구 없는 긴 답변은 조각 단위로 실시간 전달한다', async () => {
    const answerChunks = ['## 한눈에 보기\n', '가'.repeat(300), '\n\n', '나'.repeat(100)];
    const deps: OrchestratorDeps = {
      tools: TEST_TOOLS,
      zaiComplete: vi.fn(),
      executeTool: vi.fn().mockResolvedValue('{"totalCount":1,"items":[{"lawNameKo":"근로기준법","lawId":"001872"}]}'),
      zaiStreamTurn: streamTurns([
        [
          { type: 'content', text: '관련 법령을 검색해 보겠습니다.' },
          { type: 'tool_call', index: 0, id: 'call_1', name: 'search_law', arguments: '{"query":' },
          { type: 'tool_call', index: 0, arguments: '"근로기준법"}' },
        ],
        answerChunks.map((text) => ({ type: 'content' as const, text })),
      ]),
    };
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '부당해고' }], (e) => events.push(e), deps);

    expect(deps.executeTool).toHaveBeenCalledWith('search_law', '{"query":"근로기준법"}');
    const contents = events.filter((e) => e.type === 'content').map((e) => e.content);
    expect(contents.join('')).toBe(answerChunks.join(''));
    expect(contents.join('')).not.toContain('검색해 보겠습니다');
    // 임계값을 넘은 뒤에는 조각 단위로 전달
    expect(contents.length).toBeGreaterThan(1);
    expect(deps.zaiComplete).not.toHaveBeenCalled();
    expect(events[events.length - 1].type).toBe('done');
  });

  it('스트리밍 턴이 짧은 계획 문장으로 끝나면 보내지 않고 진행을 재촉한다', async () => {
    const final = '## 한눈에 보기\n' + '답'.repeat(400);
    const deps: OrchestratorDeps = {
      tools: TEST_TOOLS,
      zaiComplete: vi.fn(),
      executeTool: vi.fn(),
      zaiStreamTurn: streamTurns([
        [{ type: 'content', text: '이제 조문을 상세 조회하겠습니다.' }],
        [{ type: 'content', text: final }],
      ]),
    };
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '부당해고' }], (e) => events.push(e), deps);

    const content = events.filter((e) => e.type === 'content').map((e) => e.content).join('');
    expect(content).toBe(final);
    expect(deps.zaiStreamTurn).toHaveBeenCalledTimes(2);
  });

  it('짧지만 완성된 답변(인사 등)은 스트림이 끝난 뒤 그대로 전달한다', async () => {
    const deps: OrchestratorDeps = {
      tools: TEST_TOOLS,
      zaiComplete: vi.fn(),
      executeTool: vi.fn(),
      zaiStreamTurn: streamTurns([[{ type: 'content', text: '안녕하세요! ' }, { type: 'content', text: '무엇을 도와드릴까요?' }]]),
    };
    const events: SSEEvent[] = [];

    await orchestrateChat([{ role: 'user', content: '안녕' }], (e) => events.push(e), deps);

    expect(events).toEqual([
      { type: 'content', content: '안녕하세요! 무엇을 도와드릴까요?' },
      { type: 'done' },
    ]);
  });
});
