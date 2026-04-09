import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSession = {
  listTools: vi.fn(),
  callTool: vi.fn(),
  close: vi.fn(),
};

const mockCreateMcpClientSession = vi.fn();
const mockLegacyListMcpTools = vi.fn();
const mockLegacyCallMcpTool = vi.fn();
const mockOrchestrateChat = vi.fn();
const mockCreateZaiClient = vi.fn();
const mockWriterWrite = vi.fn();
const mockWriterClose = vi.fn();

vi.mock('@/lib/mcp/client', () => ({
  createMcpClientSession: mockCreateMcpClientSession,
  listMcpTools: mockLegacyListMcpTools,
  callMcpTool: mockLegacyCallMcpTool,
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

describe('/api/chat route MCP session lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockSession.listTools.mockResolvedValue([]);
    mockSession.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    mockSession.close.mockResolvedValue(undefined);

    mockCreateMcpClientSession.mockReturnValue(mockSession);
    mockLegacyListMcpTools.mockResolvedValue([]);
    mockLegacyCallMcpTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    mockOrchestrateChat.mockResolvedValue(undefined);
    mockCreateZaiClient.mockReturnValue({
      completeChatWithTools: vi.fn(),
      streamChat: vi.fn(),
    });
  });

  it('closes the MCP session after a successful stream completes', async () => {
    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);

    await flushMicrotasks();

    expect(mockCreateMcpClientSession).toHaveBeenCalledOnce();
    expect(mockSession.close).toHaveBeenCalledOnce();
  });

  it('closes the MCP session after orchestration errors', async () => {
    mockOrchestrateChat.mockRejectedValueOnce(new Error('upstream failed'));

    const { POST } = await import('@/app/api/chat/route');

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);

    await flushMicrotasks();

    expect(mockCreateMcpClientSession).toHaveBeenCalledOnce();
    expect(mockSession.close).toHaveBeenCalledOnce();
    expect(mockWriterWrite).toHaveBeenCalledWith({
      type: 'error',
      message: 'upstream failed',
    });
  });
});
