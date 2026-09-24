import { describe, it, expect, vi } from 'vitest';
import { parseLawDetailXml, getLawDetail, getLawArticles, normalizeArticleList } from '@/lib/law/get-law-detail';
import { LawApiClient } from '@/lib/law/client';

describe('parseLawDetailXml', () => {
  it('조문이 포함된 법령 상세를 파싱해야 한다', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: [
            {
              조문번호: '제1조',
              조문제목: '목적',
              조문내용: '이 법은 민사에 관한 기본법이다.',
            },
            {
              조문번호: 2,
              조문가지번호: 0,
              조문제목: '신의성실',
              조문내용: '권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다.',
            },
          ],
        },
      },
    };

    const result = parseLawDetailXml(parsed);

    expect(result.lawId).toBe('001');
    expect(result.lawNameKo).toBe('민법');
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].articleNumber).toBe('1');
    expect(result.articles[0].articleTitle).toBe('목적');
    expect(result.articles[1].articleContent).toContain('신의에 좇아');
  });

  it('단일 조문을 올바르게 처리해야 한다', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: {
            조문번호: '제1조',
            조문제목: '목적',
            조문내용: '이 법은 민사에 관한 기본법이다.',
          },
        },
      },
    };

    const result = parseLawDetailXml(parsed);

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].articleNumber).toBe('1');
  });

  it('조문가지번호가 있으면 의 조문을 정규화해야 한다', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: {
            조문번호: 3,
            조문가지번호: 2,
            조문제목: '특례',
            조문내용: '특례 조항이다.',
          },
        },
      },
    };

    const result = parseLawDetailXml(parsed);

    expect(result.articles[0].articleNumber).toBe('3-2');
  });
});

describe('getLawDetail', () => {
  it('클라이언트를 사용하여 법령 상세를 조회해야 한다', async () => {
    const mockParsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '민법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '19580222',
          시행일자: '19600101',
        },
        조문: {
          조문단위: [],
        },
      },
    };

    const mockClient = {
      buildDetailUrl: vi.fn().mockReturnValue('https://mock-url'),
      fetchAndParse: vi.fn().mockResolvedValue(mockParsed),
    } as unknown as LawApiClient;

    const result = await getLawDetail(mockClient, '001');

    expect(mockClient.buildDetailUrl).toHaveBeenCalledWith('law', '001', {
      articleJo: undefined,
      lawIdentifierType: 'ID',
    });
    expect(result.lawId).toBe('001');
    expect(result.lawNameKo).toBe('민법');
  });
});

/** 실제 lawService.do 응답(근로기준법 제23조, JO=002300)을 줄인 표본 */
const ARTICLE_23_XML = `<?xml version="1.0" encoding="UTF-8"?>
<법령 법령키="0018722026021921373"><기본정보><법령ID>001872</법령ID><공포일자>20260219</공포일자>
<법종구분 법종구분코드="A0002">법률</법종구분><법령명_한글><![CDATA[근로기준법]]></법령명_한글>
<소관부처 소관부처코드="1492000">고용노동부</소관부처><시행일자>20260820</시행일자></기본정보>
<조문><조문단위 조문키="0023001"><조문번호>23</조문번호><조문여부>조문</조문여부><조문제목><![CDATA[해고 등의 제한]]></조문제목>
<조문내용><![CDATA[제23조(해고 등의 제한)]]></조문내용>
<항><항번호><![CDATA[①]]></항번호><항내용><![CDATA[① 사용자는 근로자에게 정당한 이유 없이 해고, 휴직, 정직, 전직, 감봉, 그 밖의 징벌(懲罰)(이하 "부당해고등"이라 한다)을 하지 못한다.]]></항내용></항>
<항><항번호><![CDATA[②]]></항번호><항내용><![CDATA[② 사용자는 근로자가 업무상 부상 또는 질병의 요양을 위하여 휴업한 기간과 그 후 30일 동안은 해고하지 못한다.]]></항내용>
<호><호번호><![CDATA[1.]]></호번호><호내용><![CDATA[1. 예시 호]]></호내용><목><목번호><![CDATA[가.]]></목번호><목내용><![CDATA[가. 예시 목]]></목내용></목></호></항>
</조문단위></조문></법령>`;

describe('parseLawDetailXml - 항/호/목 본문', () => {
  it('조문 머리글뿐 아니라 항·호·목 본문까지 이어 붙이고, 속성 붙은 기본정보도 읽는다', () => {
    const client = new LawApiClient('test');
    const result = parseLawDetailXml(client.parseXml(ARTICLE_23_XML));

    expect(result.lawId).toBe('001872');
    expect(result.lawType).toBe('법률');
    expect(result.department).toBe('고용노동부');
    expect(result.articles).toHaveLength(1);
    const content = result.articles[0].articleContent;
    expect(content.startsWith('제23조(해고 등의 제한)')).toBe(true);
    expect(content).toContain('① 사용자는 근로자에게 정당한 이유 없이 해고');
    expect(content).toContain('② 사용자는');
    expect(content).toContain('1. 예시 호');
    expect(content).toContain('가. 예시 목');
  });

  it('장·절 제목(조문여부=전문)은 조문 목록에서 뺀다', () => {
    const result = parseLawDetailXml({
      법령: {
        기본정보: { 법령ID: '001872', 법령명_한글: '근로기준법' },
        조문: {
          조문단위: [
            { 조문번호: 1, 조문여부: '전문', 조문내용: '제1장 총칙' },
            { 조문번호: 1, 조문여부: '조문', 조문제목: '목적', 조문내용: '제1조(목적) 이 법은 ...' },
          ],
        },
      },
    });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].articleTitle).toBe('목적');
  });
});

describe('normalizeArticleList', () => {
  it('다양한 조문 번호 입력을 내부 표현으로 정규화하고 중복을 없앤다', () => {
    expect(normalizeArticleList(['제23조', '28', '43의2', '23'])).toEqual(['23', '28', '43-2']);
    expect(normalizeArticleList('23, 28')).toEqual(['23', '28']);
    expect(normalizeArticleList(undefined)).toEqual([]);
  });
});

describe('getLawArticles', () => {
  function createClient() {
    const client = new LawApiClient('test');
    const detailFor = (jo?: string) => {
      const articleNumber = jo ? String(Number(jo.slice(0, 4))) : undefined;
      return {
        법령: {
          기본정보: { 법령ID: '001872', 법령명_한글: '근로기준법' },
          조문: {
            조문단위: articleNumber
              ? [{ 조문번호: articleNumber, 조문여부: '조문', 조문제목: `제목${articleNumber}`, 조문내용: `제${articleNumber}조 본문` }]
              : [
                  { 조문번호: '23', 조문여부: '조문', 조문제목: '해고 등의 제한', 조문내용: '제23조 본문' },
                  { 조문번호: '28', 조문여부: '조문', 조문제목: '부당해고등의 구제신청', 조문내용: '제28조 본문' },
                ],
          },
        },
      };
    };
    vi.spyOn(client, 'fetchAndParse').mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname.endsWith('lawSearch.do')) {
        return { LawSearch: { totalCnt: 2, law: [{ 법령ID: '000001', 법령명한글: '근로기준법 시행령' }, { 법령ID: '001872', 법령명한글: '근로기준법' }] } };
      }
      return detailFor(parsedUrl.searchParams.get('JO') ?? undefined);
    });
    return client;
  }

  it('법령명으로 ID를 찾고, 요청한 조문만 JO 단건 조회로 가져온다', async () => {
    const client = createClient();

    const result = await getLawArticles(client, { lawName: '근로기준법', articles: ['23', '28'] });

    expect(result.lawNameKo).toBe('근로기준법');
    expect(result.articles.map((article) => article.articleNumber)).toEqual(['23', '28']);
    expect(result.articles[0].articleContent).toBe('제23조 본문');
    const detailUrls = vi.mocked(client.fetchAndParse).mock.calls
      .map(([url]) => new URL(url))
      .filter((url) => url.pathname.endsWith('lawService.do'));
    expect(detailUrls.map((url) => [url.searchParams.get('ID'), url.searchParams.get('JO')])).toEqual([
      ['001872', '002300'],
      ['001872', '002800'],
    ]);
  });

  it('조문 번호가 없으면 전체 본문 대신 목차(번호·제목)만 돌려준다', async () => {
    const client = createClient();

    const result = await getLawArticles(client, { lawId: '001872' });

    expect(result.articles).toEqual([
      { articleNumber: '23', articleTitle: '해고 등의 제한', articleContent: '' },
      { articleNumber: '28', articleTitle: '부당해고등의 구제신청', articleContent: '' },
    ]);
    expect(result.note).toContain('articles');
  });
});
