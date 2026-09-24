import { composeArticleNumber } from '@/lib/law/article-number';
import { toArray } from '@/lib/utils/array';
import type { LawApiClient, SearchParams } from '@/lib/law/client';
import type { LawArticleSearchItem, LawArticleSearchResult } from '@/lib/law/types';

/** 조문 본문 최대 길이 (LLM 컨텍스트 보호) */
const MAX_ARTICLE_CONTENT_LENGTH = 1_200;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…(이하 생략)` : text;
}

/**
 * 지능형 검색(target=aiSearch) XML 파싱 결과를 LawArticleSearchResult로 변환
 * - 자연어 질의에 대해 관련 조문 단위(법령명 + 조문번호 + 본문)를 반환한다
 */
export function parseLawArticleSearchXml(parsed: Record<string, unknown>): LawArticleSearchResult {
  const root = parsed.aiSearch as Record<string, unknown> | undefined;

  if (!root) {
    return { totalCount: 0, items: [] };
  }

  const rawItems = toArray(
    root.법령조문 as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );

  const items: LawArticleSearchItem[] = rawItems.map((item) => ({
    lawId: String(item.법령ID ?? ''),
    lawName: String(item.법령명 ?? ''),
    lawType: String(item.법령종류명 ?? ''),
    articleNumber: composeArticleNumber(
      item.조문번호 as string | number | undefined,
      item.조문가지번호 as string | number | undefined,
    ) ?? '',
    articleTitle: String(item.조문제목 ?? ''),
    articleContent: truncate(String(item.조문내용 ?? '').trim(), MAX_ARTICLE_CONTENT_LENGTH),
    enforcementDate: String(item.시행일자 ?? '').slice(0, 8),
  })).filter((item) => item.lawName && item.articleNumber);

  return { totalCount: items.length, items };
}

/**
 * 관련 조문 검색 실행 (국가법령정보센터 지능형 검색)
 * - "부당해고 구제", "전세보증금 반환"처럼 법령명을 모르는 주제어로도 조문을 찾는다
 */
export async function searchLawArticles(
  client: LawApiClient,
  params: SearchParams,
): Promise<LawArticleSearchResult> {
  const url = client.buildSearchUrl('aiSearch', { query: params.query, display: params.display });
  const parsed = await client.fetchAndParse(url);
  return parseLawArticleSearchXml(parsed as Record<string, unknown>);
}
