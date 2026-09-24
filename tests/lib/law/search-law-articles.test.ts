import { describe, expect, it, vi } from 'vitest';
import { LawApiClient } from '@/lib/law/client';
import { parseLawArticleSearchXml, searchLawArticles } from '@/lib/law/search-law-articles';

/** 실제 aiSearch 응답 구조를 줄인 표본 */
const AI_SEARCH_XML = `<?xml version="1.0" encoding="UTF-8"?><aiSearch><target>aiSearch</target><키워드>부당해고 구제신청</키워드><검색결과개수>2</검색결과개수>
<법령조문 id="1"><법령일련번호>283457</법령일련번호><법령ID>001872</법령ID><법령명><![CDATA[근로기준법]]></법령명><시행일자>20260820120800</시행일자><법령종류명>법률</법령종류명><조문번호>0028</조문번호><조문가지번호>00</조문가지번호><조문제목><![CDATA[부당해고등의 구제신청]]></조문제목><조문내용><![CDATA[제28조(부당해고등의 구제신청)
 ① 사용자가 근로자에게 부당해고등을 하면 근로자는 노동위원회에 구제를 신청할 수 있다.
 ② 제1항에 따른 구제신청은 부당해고등이 있었던 날부터 3개월 이내에 하여야 한다.]]></조문내용></법령조문>
<법령조문 id="2"><법령ID>001872</법령ID><법령명><![CDATA[근로기준법]]></법령명><시행일자>20260820120800</시행일자><법령종류명>법률</법령종류명><조문번호>0043</조문번호><조문가지번호>02</조문가지번호><조문제목><![CDATA[체불사업주 명단 공개]]></조문제목><조문내용><![CDATA[제43조의2(체불사업주 명단 공개)]]></조문내용></법령조문>
</aiSearch>`;

describe('parseLawArticleSearchXml', () => {
  it('지능형 검색 응답을 조문 단위로 변환한다 (0으로 시작하는 번호·가지번호 포함)', () => {
    const client = new LawApiClient('test');
    const result = parseLawArticleSearchXml(client.parseXml(AI_SEARCH_XML));

    expect(result.totalCount).toBe(2);
    expect(result.items[0]).toMatchObject({
      lawId: '001872',
      lawName: '근로기준법',
      articleNumber: '28',
      articleTitle: '부당해고등의 구제신청',
      enforcementDate: '20260820',
    });
    expect(result.items[0].articleContent).toContain('3개월 이내');
    expect(result.items[1].articleNumber).toBe('43-2');
  });

  it('루트가 없으면 빈 결과를 반환한다', () => {
    expect(parseLawArticleSearchXml({})).toEqual({ totalCount: 0, items: [] });
  });
});

describe('searchLawArticles', () => {
  it('aiSearch 대상으로 검색 URL을 만든다', async () => {
    const client = {
      buildSearchUrl: vi.fn().mockReturnValue('https://mock'),
      fetchAndParse: vi.fn().mockResolvedValue({ aiSearch: {} }),
    } as unknown as LawApiClient;

    await searchLawArticles(client, { query: '임금체불', display: 10 });

    expect(client.buildSearchUrl).toHaveBeenCalledWith('aiSearch', { query: '임금체불', display: 10 });
  });
});
