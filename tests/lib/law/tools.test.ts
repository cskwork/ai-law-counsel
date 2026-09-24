import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClient = { tag: 'law-client' };
const mockCreateLawApiClient = vi.fn();
const mockSearchLaw = vi.fn();
const mockSearchLawArticles = vi.fn();
const mockGetLawArticles = vi.fn();
const mockSearchPrecedent = vi.fn();
const mockGetPrecedentDetail = vi.fn();
const mockSearchAdminRule = vi.fn();

vi.mock('@/lib/law/client', () => ({
  createLawApiClient: mockCreateLawApiClient,
}));

vi.mock('@/lib/law/search-law', () => ({
  searchLawWithFallback: mockSearchLaw,
}));

vi.mock('@/lib/law/search-law-articles', () => ({
  searchLawArticles: mockSearchLawArticles,
}));

vi.mock('@/lib/law/get-law-detail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/law/get-law-detail')>()),
  getLawArticles: mockGetLawArticles,
}));

vi.mock('@/lib/law/search-precedent', () => ({
  searchPrecedentWithFallback: mockSearchPrecedent,
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
    mockSearchLawArticles.mockResolvedValue({ totalCount: 1, items: [{ lawId: '001872', lawName: '근로기준법', articleNumber: '28' }] });
    mockGetLawArticles.mockResolvedValue({ lawId: '1', lawNameKo: '민법', articles: [] });
    mockSearchPrecedent.mockResolvedValue({ totalCount: 1, items: [{ precedentId: '10', caseName: '판례' }] });
    mockGetPrecedentDetail.mockResolvedValue({ precedentId: '10', caseName: '판례', fullText: '가'.repeat(5000) });
    mockSearchAdminRule.mockResolvedValue({ totalCount: 1, items: [{ adminRuleId: '20', adminRuleName: '훈령' }] });
  });

  it('returns the built-in law tool definitions expected by the prompt', async () => {
    const { LAW_TOOL_DEFINITIONS } = await import('@/lib/law/tools');

    const names = LAW_TOOL_DEFINITIONS.map((tool) => tool.function.name);

    expect(names).toEqual([
      'search_law_articles',
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
    expect(mockSearchLaw).toHaveBeenCalledWith(mockClient, { query: '임대차', page: 2, display: undefined });
    expect(result).toBe('{"totalCount":1,"items":[{"lawId":"1","lawNameKo":"민법"}]}');
  });

  it('executes search_law_articles with a bounded result count', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    await executeLawToolCall('search_law_articles', { query: '부당해고 구제신청', display: 50 });

    expect(mockSearchLawArticles).toHaveBeenCalledWith(mockClient, { query: '부당해고 구제신청', page: undefined, display: 20 });
  });

  it('passes lawName and normalized article numbers to get_law_detail', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    await executeLawToolCall('get_law_detail', { lawName: '근로기준법', articles: ['제23조', '28', '43의2'] });

    expect(mockGetLawArticles).toHaveBeenCalledWith(mockClient, {
      lawId: undefined,
      lawName: '근로기준법',
      articles: ['23', '28', '43-2'],
    });
  });

  it('defaults search_precedent to a small result count', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    await executeLawToolCall('search_precedent', { query: '부당해고' });

    expect(mockSearchPrecedent).toHaveBeenCalledWith(mockClient, { query: '부당해고', page: undefined, display: 8 });
  });

  it('truncates long precedent full text before handing it to the LLM', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    const result = JSON.parse(await executeLawToolCall('get_precedent_detail', { precedentId: '10' }));

    expect(result.fullText.length).toBeLessThan(3_100);
    expect(result.fullText).toContain('이하 생략');
  });

  it('executes search_administrative_rule through the local law API client', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    const result = await executeLawToolCall('search_administrative_rule', { query: '임대차' });

    expect(mockSearchAdminRule).toHaveBeenCalledWith(mockClient, { query: '임대차', page: undefined, display: undefined });
    expect(result).toBe('{"totalCount":1,"items":[{"adminRuleId":"20","adminRuleName":"훈령"}]}');
  });

  it('throws on unknown tool names', async () => {
    const { executeLawToolCall } = await import('@/lib/law/tools');

    await expect(executeLawToolCall('unknown_tool', {})).rejects.toThrow('지원하지 않는 도구');
  });
});
