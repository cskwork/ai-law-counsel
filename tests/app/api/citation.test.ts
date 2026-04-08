import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mcp/client', () => ({
  callMcpTool: vi.fn(),
}));

vi.mock('@/lib/mcp/tool-bridge', () => ({
  extractToolResultText: vi.fn(),
}));

import { callMcpTool } from '@/lib/mcp/client';
import { extractToolResultText } from '@/lib/mcp/tool-bridge';

const importRoute = () => import('@/app/api/citation/route');

function createRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/citation');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

/** MCP CallToolResult mock */
function mockCallToolResult(text: string) {
  return { content: [{ type: 'text', text }], isError: false };
}

describe('GET /api/citation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('법령 인용 조회 시 200 응답을 반환해야 한다', async () => {
    const responseJson = JSON.stringify({
      lawNameKo: '주택임대차보호법',
      articles: [{ articleNumber: '3-2', articleTitle: '보증금의 회수', articleContent: '임차인이...' }],
    });
    vi.mocked(callMcpTool).mockResolvedValue(mockCallToolResult(responseJson) as never);
    vi.mocked(extractToolResultText).mockReturnValue(responseJson);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '주택임대차보호법', article: '3-2' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('statute');
    expect(body.data.name).toBe('주택임대차보호법');
    expect(body.data.fullText).toContain('임차인이');
    expect(body.data.externalUrl).toContain('law.go.kr');
  });

  it('판례 인용 조회 시 200 응답을 반환해야 한다', async () => {
    const responseJson = JSON.stringify({
      caseName: '손해배상 판결',
      caseNumber: '2023다12345',
      fullText: '판결 전문...',
    });
    vi.mocked(callMcpTool).mockResolvedValue(mockCallToolResult(responseJson) as never);
    vi.mocked(extractToolResultText).mockReturnValue(responseJson);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'precedent', id: '2023다12345' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('precedent');
  });

  it('필수 파라미터 누락 시 400 응답을 반환해야 한다', async () => {
    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute' }); // id 누락
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('MCP 호출 실패 시 503 응답을 반환해야 한다', async () => {
    vi.mocked(callMcpTool).mockRejectedValue(new Error('MCP connection failed'));

    const { GET } = await importRoute();
    const request = createRequest({ type: 'statute', id: '민법', article: '750' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toContain('국가법령정보센터');
  });
});
