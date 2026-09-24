import { toArray } from '@/lib/utils/array';
import type { LawApiClient, SearchParams } from '@/lib/law/client';
import { searchLawArticles } from '@/lib/law/search-law-articles';
import type { LawSearchItem, LawSearchResult } from '@/lib/law/types';

/**
 * 법령 검색 XML 파싱 결과를 LawSearchResult로 변환
 * 한글 XML 필드명을 영문 인터페이스에 매핑
 */
export function parseLawSearchXml(parsed: Record<string, unknown>): LawSearchResult {
  const root = parsed.LawSearch as Record<string, unknown> | undefined;

  if (!root) {
    return { totalCount: 0, items: [] };
  }

  const totalCount = Number(root.totalCnt) || 0;
  const rawItems = toArray(root.law as Record<string, unknown> | Record<string, unknown>[] | undefined);

  const items: LawSearchItem[] = rawItems.map((item) => {
    const rawDetailLink = String(item.법령상세링크 ?? '').trim();
    const detailLink = rawDetailLink
      ? (rawDetailLink.startsWith('http') ? rawDetailLink : `https://www.law.go.kr${rawDetailLink}`)
      : '';

    return {
      lawId: String(item.법령ID ?? ''),
      lawNameKo: String(item.법령명한글 ?? ''),
      lawAbbreviation: String(item.법령약칭명 ?? ''),
      lawType: String(item.법령구분명 ?? ''),
      department: String(item.소관부처명 ?? ''),
      promulgationDate: String(item.공포일자 ?? ''),
      promulgationNumber: String(item.공포번호 ?? ''),
      enforcementDate: String(item.시행일자 ?? ''),
      amendmentType: String(item.제개정구분명 ?? ''),
      detailLink: detailLink || undefined,
    };
  });

  return { totalCount, items };
}

/**
 * 법령 검색 실행
 * 클라이언트로 검색 URL 생성 후 API 호출 및 결과 파싱
 */
export async function searchLaw(
  client: LawApiClient,
  params: SearchParams
): Promise<LawSearchResult> {
  const url = client.buildSearchUrl('law', params);
  const parsed = await client.fetchAndParse(url);
  return parseLawSearchXml(parsed as Record<string, unknown>);
}

/**
 * 법령명 검색 결과에서 이름이 정확히 같은 법령을 고른다 (공백 무시)
 * - "민법" 검색 결과는 "난민법"이 먼저 나오므로 첫 항목을 그대로 쓰면 안 된다
 */
export function pickLawByName(items: readonly LawSearchItem[], lawName: string): LawSearchItem | undefined {
  const compact = (value: string) => value.replace(/\s+/g, '');
  const target = compact(lawName);
  return items.find((item) => compact(item.lawNameKo) === target)
    ?? items.find((item) => compact(item.lawAbbreviation) === target)
    ?? items[0];
}

/** 법령명처럼 보이는 단어 (예: "근로기준법", "주택임대차보호법") */
const LAW_NAME_TOKEN = /(법|법률|령|규칙)$/;

/** 법령명 단어로 보이지만 단독으로는 의미 없는 일반어 */
const GENERIC_LAW_WORDS = new Set(['시행령', '시행규칙', '법률', '특별법']);

/** 대체 검색 시 관련 조문 최대 수 */
const FALLBACK_ARTICLE_LIMIT = 8;

/**
 * 도구용 법령 검색 (대체 검색 포함)
 * - lawSearch.do의 기본 검색은 "법령명"만 대상으로 하므로 "근로기준법 해고", "부당해고" 같은
 *   주제어 질의는 0건이 된다.
 * - 0건이면 ① 질의 속 법령명 단어로 다시 찾고, ② 그래도 없으면 지능형 검색으로 관련 조문과
 *   그 조문이 속한 법령을 돌려준다.
 */
export async function searchLawWithFallback(
  client: LawApiClient,
  params: SearchParams,
): Promise<LawSearchResult> {
  const query = params.query.trim();
  const direct = await searchLaw(client, { ...params, query });
  if (direct.totalCount > 0 || !query) {
    return direct;
  }

  const lawNameTokens = query
    .split(/\s+/)
    .filter((token) => token !== query && token.length >= 3 && LAW_NAME_TOKEN.test(token) && !GENERIC_LAW_WORDS.has(token));

  for (const token of lawNameTokens) {
    const byToken = await searchLaw(client, { query: token, display: params.display });
    if (byToken.totalCount > 0) {
      return {
        ...byToken,
        searchNote: `"${query}"와 이름이 일치하는 법령이 없어 "${token}"(으)로 다시 검색했습니다. 주제로 조문을 찾으려면 search_law_articles를 사용하세요.`,
      };
    }
  }

  const articles = await searchLawArticles(client, { query, display: 10 });
  const seen = new Set<string>();
  const items: LawSearchItem[] = [];
  for (const article of articles.items) {
    if (seen.has(article.lawId)) continue;
    seen.add(article.lawId);
    items.push({
      lawId: article.lawId,
      lawNameKo: article.lawName,
      lawAbbreviation: '',
      lawType: article.lawType,
      department: '',
      promulgationDate: '',
      promulgationNumber: '',
      enforcementDate: article.enforcementDate,
      amendmentType: '',
    });
  }

  return {
    totalCount: items.length,
    items,
    relatedArticles: articles.items.slice(0, FALLBACK_ARTICLE_LIMIT),
    searchNote: `"${query}"와 이름이 일치하는 법령이 없어 내용 기반(지능형) 검색으로 관련 법령과 조문을 찾았습니다.`,
  };
}
