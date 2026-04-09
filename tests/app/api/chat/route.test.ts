import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockExecuteLawToolCall = vi.fn();
const mockOrchestrateChat = vi.fn();
const mockCreateZaiClient = vi.fn();
const mockWriterWrite = vi.fn();
const mockWriterClose = vi.fn();

vi.mock('@/lib/law/tools', () => ({
  LAW_TOOL_DEFINITIONS: [
    {
      type: 'function',
      function: {
        name: 'search_law',
        description: '법령 검색',
        parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
    },
  ],
  executeLawToolCall: mockExecuteLawToolCall,
}));

vi.mock('@/lib/chat/orchestrator', () => ({
  orchestrateChat: mockOrchestrateChat,
}));

vi.mock('@/lib/zai/client', () => ({
  createZaiClient: mockCreateZaiClient,
}));

vi.mock('@/lib/utils/sse', () => ({
  createSSEStream: () => ({
    stream: new ReadableStream<Uint8Array>(),
    writer: {
      write: mockWriterWrite,
      close: mockWriterClose,
    },
  }),
}));

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function buildRequest(): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: '임대차 분쟁 상담이 필요합니다.' }],
    }),
  });
}

describe('/api/chat route local law tool wiring', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockExecuteLawToolCall.mockResolvedValue('{"totalCount":1,"items":[]}');
    mockOrchestrateChat.mockResolvedValue(undefined);
    mockCreateZaiClient.mockReturnValue({
      completeChatWithTools: vi.fn(),
      streamChat: vi.fn(),
    });
  });

  it('returns an SSE response and delegates tool execution to local law tools', async () => {
    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);

    await flushMicrotasks();

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(mockOrchestrateChat).toHaveBeenCalledOnce();
  });

  it('writes an SSE error event when orchestration fails', async () => {
    mockOrchestrateChat.mockRejectedValueOnce(new Error('upstream failed'));

    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);

    await flushMicrotasks();

    expect(mockWriterWrite).toHaveBeenCalledWith({
      type: 'error',
      message: 'upstream failed',
    });
  });
});
