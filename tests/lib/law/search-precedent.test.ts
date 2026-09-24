import { describe, it, expect, vi } from 'vitest';
import { parsePrecedentSearchXml, searchPrecedent, searchPrecedentWithFallback } from '@/lib/law/search-precedent';
import type { LawApiClient } from '@/lib/law/client';

describe('parsePrecedentSearchXml', () => {
  it('판례 검색 결과를 올바르게 파싱해야 한다', () => {
    const parsed = {
      PrecSearch: {
        totalCnt: 1,
        prec: {
          판례일련번호: '12345',
          사건명: '손해배상(기)',
          사건번호: '2023다12345',
          선고일자: '20230915',
          선고: '선고',
          법원명: '대법원',
          사건종류명: '민사',
          판시사항: '판시사항 내용',
          판결요지: '판결요지 내용',
        },
      },
    };

    const result = parsePrecedentSearchXml(parsed);

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].precedentId).toBe('12345');
    expect(result.items[0].caseName).toBe('손해배상(기)');
    expect(result.items[0].courtName).toBe('대법원');
  });

  it('빈 결과를 올바르게 처리해야 한다', () => {
    const parsed = {
      PrecSearch: {
        totalCnt: 0,
      },
    };

    const result = parsePrecedentSearchXml(parsed);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('searchPrecedent', () => {
  it('클라이언트를 사용하여 판례를 검색해야 한다', async () => {
    const mockParsed = {
      PrecSearch: {
        totalCnt: 1,
        prec: {
          판례일련번호: '12345',
          사건명: '손해배상(기)',
          사건번호: '2023다12345',
          선고일자: '20230915',
          선고: '선고',
          법원명: '대법원',
          사건종류명: '민사',
          판시사항: '판시사항 내용',
          판결요지: '판결요지 내용',
        },
      },
    };

    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await searchPrecedent(mockClient, { query: '손해배상' });

    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('prec', { query: '손해배상' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0].precedentId).toBe('12345');
  });
});

describe('searchPrecedentWithFallback', () => {
  function createClient(byName: number, byBody: number) {
    return {
      buildSearchUrl: vi.fn((_target: string, params: Record<string, unknown>) => JSON.stringify(params)),
      fetchAndParse: vi.fn(async (url: string) => {
        const params = JSON.parse(url) as { search?: number };
        const count = params.search === 2 ? byBody : byName;
        return {
          PrecSearch: {
            totalCnt: count,
            prec: Array.from({ length: Math.min(count, 2) }, (_, i) => ({ 판례일련번호: `${i}`, 사건명: '부당해고구제재심판정취소', 사건번호: `2025두${i}` })),
          },
        };
      }),
    } as unknown as LawApiClient;
  }

  it('사건명 검색 결과가 있으면 본문 검색을 하지 않는다', async () => {
    const client = createClient(408, 1217);

    const result = await searchPrecedentWithFallback(client, { query: '부당해고' });

    expect(result.totalCount).toBe(408);
    expect(result.searchNote).toBeUndefined();
    expect(client.fetchAndParse).toHaveBeenCalledTimes(1);
  });

  it('사건명 검색이 0건이면 판결 본문 검색(search=2)으로 다시 찾는다', async () => {
    const client = createClient(0, 266);

    const result = await searchPrecedentWithFallback(client, { query: '근로기준법 제23조 부당해고', display: 8 });

    expect(client.buildSearchUrl).toHaveBeenLastCalledWith('prec', { query: '근로기준법 제23조 부당해고', display: 8, search: 2 });
    expect(result.totalCount).toBe(266);
    expect(result.searchNote).toContain('본문');
  });
});
