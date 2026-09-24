import { describe, expect, it } from 'vitest';
import { createSourceLedger, deduplicateSources, recordToolResult, selectCitedSources } from '@/lib/chat/sources';

function ledgerWithDismissalResearch() {
  const ledger = createSourceLedger();
  recordToolResult(ledger, 'search_law_articles', JSON.stringify({
    totalCount: 2,
    items: [
      { lawId: '001872', lawName: '근로기준법', articleNumber: '28', articleTitle: '부당해고등의 구제신청', articleContent: '...' },
      { lawId: '006859', lawName: '근로기준법 시행규칙', articleNumber: '5', articleTitle: '부당해고등의 구제신청', articleContent: '...' },
    ],
  }));
  recordToolResult(ledger, 'get_law_detail', JSON.stringify({
    lawId: '001872',
    lawNameKo: '근로기준법',
    articles: [{ articleNumber: '23', articleTitle: '해고 등의 제한', articleContent: '제23조(해고 등의 제한) ...' }],
  }));
  recordToolResult(ledger, 'search_precedent', JSON.stringify({
    totalCount: 397,
    items: [
      { precedentId: '616245', caseNumber: '2023두54914', caseName: '부당해고구제재심판정취소', courtName: '대법원' },
      { precedentId: '999', caseNumber: '2025두1', caseName: '무관한 사건', courtName: '대법원' },
    ],
  }));
  return ledger;
}

describe('selectCitedSources', () => {
  it('답변이 인용한(cite 링크·본문 언급) 자료만, 조문 단위 링크로 돌려준다', () => {
    const ledger = ledgerWithDismissalResearch();
    const answer = [
      '[근로기준법 제23조](cite:statute/근로기준법/23)에 따라 정당한 이유 없는 해고는 금지됩니다.',
      '구제신청은 근로기준법 제28조, 신청서는 「근로기준법 시행규칙」 제5조를 따릅니다.',
      '[대법원 2023두54914](cite:precedent/2023두54914) 참고.',
    ].join('\n');

    const sources = selectCitedSources(answer, ledger);

    expect(sources.map((s) => s.name)).toEqual([
      '근로기준법 제23조',
      '근로기준법 시행규칙 제5조',
      '근로기준법 제28조',
      '대법원 2023두54914 부당해고구제재심판정취소',
    ]);
    expect(sources[0].url).toBe(`https://www.law.go.kr/법령/${encodeURIComponent('근로기준법')}/${encodeURIComponent('제23조')}`);
    expect(sources[3].url).toBe('https://www.law.go.kr/LSW/precInfoP.do?precSeq=616245');
    // 검색만 된 무관한 판례는 출처가 아니다
    expect(sources.some((s) => s.identifier === '2025두1')).toBe(false);
  });

  it('도구로 조회하지 않은 법령·판례 인용은 출처로 인정하지 않는다', () => {
    const ledger = ledgerWithDismissalResearch();

    const sources = selectCitedSources('[민법 제750조](cite:statute/민법/750), [대법원 2020다1](cite:precedent/2020다1)', ledger);

    expect(sources).toEqual([
      expect.objectContaining({ name: '근로기준법 제23조' }), // 인용이 없으니 본문을 읽은 자료로 대체
    ]);
  });

  it('인용 표기가 없으면 본문까지 읽은 자료만 출처로 쓴다', () => {
    const ledger = ledgerWithDismissalResearch();

    const sources = selectCitedSources('일반적인 안내입니다.', ledger);

    expect(sources.map((s) => s.name)).toEqual(['근로기준법 제23조']);
  });

  it('get_precedent_detail로 읽은 판례는 대체 출처에 포함된다', () => {
    const ledger = createSourceLedger();
    recordToolResult(ledger, 'get_precedent_detail', JSON.stringify({
      precedentId: '616245', caseNumber: '2023두54914', caseName: '부당해고구제재심판정취소', courtName: '대법원',
    }));

    expect(selectCitedSources('', ledger)).toEqual([
      expect.objectContaining({ type: 'precedent', identifier: '2023두54914' }),
    ]);
  });

  it('잘못된 JSON 결과는 무시한다', () => {
    const ledger = createSourceLedger();
    recordToolResult(ledger, 'search_law', 'not json');
    expect(selectCitedSources('근로기준법 제23조', ledger)).toEqual([]);
  });
});

describe('deduplicateSources', () => {
  it('동일한 type+identifier 출처를 중복 제거한다', () => {
    const sources = [
      { type: 'law' as const, name: '민법', identifier: '10101', url: 'a' },
      { type: 'law' as const, name: '민법', identifier: '10101', url: 'a' },
      { type: 'precedent' as const, name: '사건', identifier: '2023다1' },
    ];
    expect(deduplicateSources(sources)).toHaveLength(2);
  });
});
