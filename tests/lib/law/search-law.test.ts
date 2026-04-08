import { describe, it, expect, vi } from 'vitest';
import { parseLawSearchXml, searchLaw } from '@/lib/law/search-law';
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
