import { describe, it, expect, vi } from 'vitest';
import { parseLawSearchXml, pickLawByName, searchLaw, searchLawWithFallback } from '@/lib/law/search-law';
import type { LawApiClient } from '@/lib/law/client';

describe('parseLawSearchXml', () => {
  it('복수 결과를 올바르게 파싱해야 한다', () => {
    const parsed = {
      LawSearch: {
        totalCnt: 2,
        law: [
          {
            법령ID: '001',
            법령명한글: '민법',
            법령약칭명: '민법',
            법령구분명: '법률',
            소관부처명: '법무부',
            공포일자: '19580222',
            공포번호: '471',
            시행일자: '19600101',
            제개정구분명: '제정',
            법령상세링크: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=1',
          },
          {
            법령ID: '002',
            법령명한글: '형법',
            법령약칭명: '형법',
            법령구분명: '법률',
            소관부처명: '법무부',
            공포일자: '19530918',
            공포번호: '293',
            시행일자: '19531018',
            제개정구분명: '제정',
            법령상세링크: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=2',
          },
        ],
      },
    };

    const result = parseLawSearchXml(parsed);

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].lawId).toBe('001');
    expect(result.items[0].lawNameKo).toBe('민법');
    expect(result.items[0].detailLink).toContain('lsiSeq=1');
    expect(result.items[1].lawId).toBe('002');
  });

  it('단일 결과(배열 아님)를 올바르게 처리해야 한다', () => {
    const parsed = {
      LawSearch: {
        totalCnt: 1,
        law: {
          법령ID: '001',
          법령명한글: '민법',
          법령약칭명: '민법',
          법령구분명: '법률',
          소관부처명: '법무부',
          공포일자: '19580222',
          공포번호: '471',
          시행일자: '19600101',
          제개정구분명: '제정',
          법령상세링크: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=1',
        },
      },
    };

    const result = parseLawSearchXml(parsed);

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].lawNameKo).toBe('민법');
  });

  it('빈 결과를 올바르게 처리해야 한다', () => {
    const parsed = {
      LawSearch: {
        totalCnt: 0,
      },
    };

    const result = parseLawSearchXml(parsed);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('searchLaw', () => {
  it('클라이언트를 사용하여 법령을 검색해야 한다', async () => {
    const mockParsed = {
      LawSearch: {
        totalCnt: 1,
        law: {
          법령ID: '001',
          법령명한글: '민법',
          법령약칭명: '민법',
          법령구분명: '법률',
          소관부처명: '법무부',
          공포일자: '19580222',
          공포번호: '471',
          시행일자: '19600101',
          제개정구분명: '제정',
        },
      },
    };

    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await searchLaw(mockClient, { query: '민법' });

    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('law', { query: '민법' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0].lawId).toBe('001');
  });
});

/**
 * 요청 파라미터에 따라 응답을 돌려주는 모의 클라이언트
 * buildSearchUrl은 요청 내용을 JSON으로 담아 fetchAndParse에 넘긴다
 */
function createRoutingClient(
  respond: (request: { target: string; query: string; search?: number }) => Record<string, unknown>,
) {
  return {
    buildSearchUrl: vi.fn((target: string, params: Record<string, unknown>) => JSON.stringify({ target, ...params })),
    fetchAndParse: vi.fn(async (url: string) => respond(JSON.parse(url))),
  } as unknown as LawApiClient;
}

function lawXml(names: Array<[string, string]>) {
  return {
    LawSearch: {
      totalCnt: names.length,
      law: names.map(([id, name]) => ({ 법령ID: id, 법령명한글: name })),
    },
  };
}

describe('pickLawByName', () => {
  it('첫 항목이 아니라 이름이 정확히 같은 법령을 고른다 ("민법" 검색 시 "난민법"이 먼저 옴)', () => {
    const items = parseLawSearchXml(lawXml([['1', '난민법'], ['2', '난민법 시행령'], ['3', '민법']])).items;

    expect(pickLawByName(items, '민법')?.lawId).toBe('3');
    expect(pickLawByName(items, '근로 기준법')?.lawId).toBe('1');
  });
});

describe('searchLawWithFallback', () => {
  it('법령명이 일치하면 그대로 반환한다', async () => {
    const client = createRoutingClient(() => lawXml([['001872', '근로기준법']]));

    const result = await searchLawWithFallback(client, { query: '근로기준법' });

    expect(result.items[0].lawNameKo).toBe('근로기준법');
    expect(result.searchNote).toBeUndefined();
  });

  it('"근로기준법 해고"처럼 법령명+주제어면 법령명 단어로 다시 검색한다', async () => {
    const client = createRoutingClient(({ query }) =>
      query === '근로기준법' ? lawXml([['001872', '근로기준법']]) : { LawSearch: { totalCnt: 0 } });

    const result = await searchLawWithFallback(client, { query: '근로기준법 해고' });

    expect(result.totalCount).toBe(1);
    expect(result.items[0].lawId).toBe('001872');
    expect(result.searchNote).toContain('근로기준법');
  });

  it('주제어("부당해고 구제")만 있으면 지능형 검색으로 관련 법령과 조문을 돌려준다', async () => {
    const client = createRoutingClient(({ target }) => {
      if (target === 'aiSearch') {
        return {
          aiSearch: {
            법령조문: [
              { 법령ID: '001872', 법령명: '근로기준법', 조문번호: '0028', 조문가지번호: '00', 조문제목: '부당해고등의 구제신청', 조문내용: '제28조(부당해고등의 구제신청)' },
              { 법령ID: '001872', 법령명: '근로기준법', 조문번호: '0030', 조문가지번호: '00', 조문제목: '구제명령 등', 조문내용: '제30조(구제명령 등)' },
              { 법령ID: '006859', 법령명: '근로기준법 시행규칙', 조문번호: '0005', 조문가지번호: '00', 조문제목: '부당해고등의 구제신청', 조문내용: '제5조' },
            ],
          },
        };
      }
      return { LawSearch: { totalCnt: 0 } };
    });

    const result = await searchLawWithFallback(client, { query: '부당해고 구제' });

    expect(result.items.map((item) => item.lawNameKo)).toEqual(['근로기준법', '근로기준법 시행규칙']);
    expect(result.relatedArticles?.map((article) => article.articleNumber)).toEqual(['28', '30', '5']);
    expect(result.searchNote).toContain('지능형');
  });
});
