import { describe, it, expect, vi } from 'vitest';
import { parseAdminRuleSearchXml, searchAdminRule } from '@/lib/law/search-admin-rule';
import type { LawApiClient } from '@/lib/law/client';

describe('parseAdminRuleSearchXml', () => {
  it('행정규칙 검색 결과를 올바르게 파싱해야 한다', () => {
    const parsed = {
      AdmRulSearch: {
        totalCnt: 2,
        admrul: [
          {
            행정규칙ID: 'AR001',
            행정규칙명: '공무원 복무규칙',
            소관부처명: '인사혁신처',
            제정일자: '20100301',
            시행일자: '20100401',
          },
          {
            행정규칙ID: 'AR002',
            행정규칙명: '예산편성지침',
            소관부처명: '기획재정부',
            제정일자: '20200101',
            시행일자: '20200201',
          },
        ],
      },
    };

    const result = parseAdminRuleSearchXml(parsed);

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].adminRuleId).toBe('AR001');
    expect(result.items[0].adminRuleName).toBe('공무원 복무규칙');
    expect(result.items[1].department).toBe('기획재정부');
  });

  it('빈 결과를 올바르게 처리해야 한다', () => {
    const parsed = {
      AdmRulSearch: {
        totalCnt: 0,
      },
    };

    const result = parseAdminRuleSearchXml(parsed);

    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('searchAdminRule', () => {
  it('클라이언트를 사용하여 행정규칙을 검색해야 한다', async () => {
    const mockParsed = {
      AdmRulSearch: {
        totalCnt: 1,
        admrul: {
          행정규칙ID: 'AR001',
          행정규칙명: '공무원 복무규칙',
          소관부처명: '인사혁신처',
          제정일자: '20100301',
          시행일자: '20100401',
        },
      },
    };

    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await searchAdminRule(mockClient, { query: '복무' });

    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('admrul', { query: '복무' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0].adminRuleId).toBe('AR001');
  });
});
