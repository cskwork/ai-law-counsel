import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClient = { tag: 'law-client' };
const mockCreateLawApiClient = vi.fn();
const mockSearchLaw = vi.fn();
const mockGetLawDetail = vi.fn();
const mockSearchPrecedent = vi.fn();
const mockGetPrecedentDetail = vi.fn();
const mockSearchAdminRule = vi.fn();

vi.mock('@/lib/law/client', () => ({
  createLawApiClient: mockCreateLawApiClient,
}));

vi.mock('@/lib/law/search-law', () => ({
  searchLaw: mockSearchLaw,
}));

vi.mock('@/lib/law/get-law-detail', () => ({
  getLawDetail: mockGetLawDetail,
}));

vi.mock('@/lib/law/search-precedent', () => ({
  searchPrecedent: mockSearchPrecedent,
}));

vi.mock('@/lib/law/get-precedent-detail', () => ({
  getPrecedentDetail: mockGetPrecedentDetail,
}));

vi.mock('@/lib/law/search-admin-rule', () => ({
  searchAdminRule: mockSearchAdminRule,
}));

describe('local law tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLawApiClient.mockReturnValue(mockClient);
    mockSearchLaw.mockResolvedValue({ totalCount: 1, items: [{ lawId: '1', lawNameKo: '민법' }] });
    mockGetLawDetail.mockResolvedValue({ lawId: '1', lawNameKo: '민법', articles: [] });
    mockSearchPrecedent.mockResolvedValue({ totalCount: 1, items: [{ precedentId: '10', caseName: '판례' }] });
    mockGetPrecedentDetail.mockResolvedValue({ precedentId: '10', caseName: '판례', fullText: '본문' });
    mockSearchAdminRule.mockResolvedValue({ totalCount: 1, items: [{ adminRuleId: '20', adminRuleName: '훈령' }] });
  });

  it('returns the built-in law tool definitions expected by the prompt', async () => {
    const { LAW_TOOL_DEFINITIONS } = await import('@/lib/law/tools');

    const names = LAW_TOOL_DEFINITIONS.map((tool) => tool.function.name);

    expect(names).toEqual([
      'search_law',
      'get_law_detail',
      'search_precedent',
      'get_precedent_detail',
      'search_administrative_rule',
    ]);
  });

  it('executes search_law through the local law API client', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    const result = await executeLawToolCall('search_law', { query: '임대차', page: 2 });

    expect(mockCreateLawApiClient).toHaveBeenCalledOnce();
    expect(mockSearchLaw).toHaveBeenCalledWith(mockClient, { query: '임대차', page: 2 });
    expect(result).toBe('{"totalCount":1,"items":[{"lawId":"1","lawNameKo":"민법"}]}');
  });

  it('executes search_administrative_rule through the local law API client', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    const result = await executeLawToolCall('search_administrative_rule', { query: '임대차' });

    expect(mockSearchAdminRule).toHaveBeenCalledWith(mockClient, { query: '임대차' });
    expect(result).toBe('{"totalCount":1,"items":[{"adminRuleId":"20","adminRuleName":"훈령"}]}');
  });

  it('throws on unknown tool names', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    await expect(executeLawToolCall('unknown_tool', {})).rejects.toThrow('지원하지 않는 도구');
  });
});
