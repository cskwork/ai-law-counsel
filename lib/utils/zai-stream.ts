/**
 * Z.ai SSE 스트림 파서
 * - parseZaiStream: content delta만 추출 (도구 없는 최종 답변용)
 * - parseZaiTurnStream: content와 tool_call delta를 함께 추출 (도구를 쓸 수 있는 턴용)
 */

/** 도구를 쓸 수 있는 턴의 스트림 조각 */
export type ZaiTurnDelta =
  | { readonly type: 'content'; readonly text: string }
  | {
      readonly type: 'tool_call';
      readonly index: number;
      readonly id?: string;
      readonly name?: string;
      /** 인자 JSON 조각 (같은 index끼리 이어 붙인다) */
      readonly arguments?: string;
    };

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

/** SSE data 줄을 JSON 청크로 읽어 낸다 */
async function* readChunks(response: Response): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          finished = true;
          return;
        }

        try {
          yield JSON.parse(data) as StreamChunk;
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  } finally {
    // 소비자가 중간에 멈추면(반복 출력 중단 등) 남은 응답을 받지 않도록 취소
    if (!finished) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

export async function* parseZaiStream(
  response: Response,
): AsyncGenerator<string> {
  for await (const chunk of readChunks(response)) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function* parseZaiTurnStream(
  response: Response,
): AsyncGenerator<ZaiTurnDelta> {
  for await (const chunk of readChunks(response)) {
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      yield { type: 'content', text: delta.content };
    }

    const toolCalls = delta.tool_calls ?? [];
    for (let position = 0; position < toolCalls.length; position++) {
      const call = toolCalls[position];
      yield {
        type: 'tool_call',
        index: call.index ?? position,
        id: call.id,
        name: call.function?.name,
        arguments: call.function?.arguments,
      };
    }
  }
}
