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
    // 1단계: search_law 결과 (법령명 → MST ID 해석)
    const searchJson = JSON.stringify({
      items: [{ lawId: '001234', lawNameKo: '주택임대차보호법' }],
    });
    // 2단계: get_law_detail 결과
    const detailJson = JSON.stringify({
      lawNameKo: '주택임대차보호법',
      articles: [{ articleNumber: '3-2', articleTitle: '보증금의 회수', articleContent: '임차인이...' }],
    });
    vi.mocked(callMcpTool)
      .mockResolvedValueOnce(mockCallToolResult(searchJson) as never)
      .mockResolvedValueOnce(mockCallToolResult(detailJson) as never);
    vi.mocked(extractToolResultText)
      .mockReturnValueOnce(searchJson)
      .mockReturnValueOnce(detailJson);

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
    // 2단계 호출에서 실제 MST ID가 사용되었는지 검증
    expect(vi.mocked(callMcpTool)).toHaveBeenCalledWith('get_law_detail', { lawId: '001234' });
  });

  it('판례 인용 조회 시 200 응답을 반환해야 한다', async () => {
    // 1단계: search_precedent 결과 (사건번호 → precedentId 해석)
    const searchJson = JSON.stringify({
      items: [{ precedentId: 'PREC_567', caseName: '손해배상 판결', caseNumber: '2023다12345' }],
    });
    // 2단계: get_precedent_detail 결과
    const detailJson = JSON.stringify({
      caseName: '손해배상 판결',
      caseNumber: '2023다12345',
      fullText: '판결 전문...',
    });
    vi.mocked(callMcpTool)
      .mockResolvedValueOnce(mockCallToolResult(searchJson) as never)
      .mockResolvedValueOnce(mockCallToolResult(detailJson) as never);
    vi.mocked(extractToolResultText)
      .mockReturnValueOnce(searchJson)
      .mockReturnValueOnce(detailJson);

    const { GET } = await importRoute();
    const request = createRequest({ type: 'precedent', id: '2023다12345' });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('precedent');
    expect(vi.mocked(callMcpTool)).toHaveBeenCalledWith('get_precedent_detail', { precedentId: 'PREC_567' });
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
