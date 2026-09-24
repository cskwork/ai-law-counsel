import { describe, expect, it } from 'vitest';
import { parseZaiStream, parseZaiTurnStream, type ZaiTurnDelta } from '@/lib/utils/zai-stream';

function sseResponse(chunks: unknown[], { splitAt }: { splitAt?: number } = {}): Response {
  const body = chunks.map((chunk) => `data: ${typeof chunk === 'string' ? chunk : JSON.stringify(chunk)}\n\n`).join('');
  const encoder = new TextEncoder();
  const parts = splitAt ? [body.slice(0, splitAt), body.slice(splitAt)] : [body];
  return new Response(new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  }));
}

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of generator) items.push(item);
  return items;
}

/** 실제 GLM 스트림 형태: reasoning_content → content → tool_calls → finish */
const GLM_TOOL_TURN = [
  { choices: [{ index: 0, delta: { role: 'assistant', reasoning_content: '사용자가 부당해고를...' } }] },
  { choices: [{ index: 0, delta: { role: 'assistant', content: '검색해 보겠습니다.' } }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ id: 'call_1', index: 0, type: 'function', function: { name: 'search_law_articles', arguments: '{"query":"부당해고 구제신청"}' } }] } }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ id: 'call_2', index: 1, type: 'function', function: { name: 'search_precedent', arguments: '{"query":' } }] } }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 1, function: { arguments: '"부당해고"}' } }] } }] },
  { choices: [{ index: 0, finish_reason: 'tool_calls', delta: { role: 'assistant', content: '' } }] },
  '[DONE]',
];

describe('parseZaiTurnStream', () => {
  it('content와 tool_call 조각을 순서대로 내보내고 reasoning_content는 무시한다', async () => {
    const deltas = await collect(parseZaiTurnStream(sseResponse(GLM_TOOL_TURN, { splitAt: 57 })));

    expect(deltas).toEqual<ZaiTurnDelta[]>([
      { type: 'content', text: '검색해 보겠습니다.' },
      { type: 'tool_call', index: 0, id: 'call_1', name: 'search_law_articles', arguments: '{"query":"부당해고 구제신청"}' },
      { type: 'tool_call', index: 1, id: 'call_2', name: 'search_precedent', arguments: '{"query":' },
      { type: 'tool_call', index: 1, id: undefined, name: undefined, arguments: '"부당해고"}' },
    ]);
  });
});

describe('parseZaiStream', () => {
  it('content 조각만 내보낸다', async () => {
    const chunks = await collect(parseZaiStream(sseResponse(GLM_TOOL_TURN)));
    expect(chunks).toEqual(['검색해 보겠습니다.']);
  });

  it('소비자가 중간에 멈춰도 예외 없이 정리된다', async () => {
    const response = sseResponse([
      { choices: [{ delta: { content: 'a' } }] },
      { choices: [{ delta: { content: 'b' } }] },
    ]);
    for await (const chunk of parseZaiStream(response)) {
      expect(chunk).toBe('a');
      break;
    }
  });
});
