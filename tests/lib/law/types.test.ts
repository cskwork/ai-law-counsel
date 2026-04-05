import { describe, it, expect } from 'vitest';
import { isLawSearchResult } from '@/lib/law/types';
import type { LawSearchResult } from '@/lib/law/types';

describe('isLawSearchResult', () => {
  it('올바른 LawSearchResult 구조를 인식해야 한다', () => {
    const valid: LawSearchResult = {
      totalCount: 1,
      items: [
        {
          lawId: '123',
          lawNameKo: '민법',
          lawAbbreviation: '민법',
          lawType: '법률',
          department: '법무부',
          promulgationDate: '19580222',
          promulgationNumber: '471',
          enforcementDate: '19600101',
          amendmentType: '일부개정',
        },
      ],
    };

    expect(isLawSearchResult(valid)).toBe(true);
  });

  it('totalCount가 숫자가 아닌 경우 false를 반환해야 한다', () => {
    const invalid = {
      totalCount: '1',
      items: [],
    };

    expect(isLawSearchResult(invalid)).toBe(false);
  });

  it('items가 배열이 아닌 경우 false를 반환해야 한다', () => {
    const invalid = {
      totalCount: 1,
      items: 'not-an-array',
    };

    expect(isLawSearchResult(invalid)).toBe(false);
  });

  it('null 입력에 대해 false를 반환해야 한다', () => {
    expect(isLawSearchResult(null)).toBe(false);
  });

  it('undefined 입력에 대해 false를 반환해야 한다', () => {
    expect(isLawSearchResult(undefined)).toBe(false);
  });

  it('빈 객체에 대해 false를 반환해야 한다', () => {
    expect(isLawSearchResult({})).toBe(false);
  });

  it('items가 누락된 경우 false를 반환해야 한다', () => {
    expect(isLawSearchResult({ totalCount: 0 })).toBe(false);
  });

  it('totalCount가 누락된 경우 false를 반환해야 한다', () => {
    expect(isLawSearchResult({ items: [] })).toBe(false);
  });
});
