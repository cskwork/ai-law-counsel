import { toArray } from '@/lib/utils/array';
import type { LawApiClient } from '@/lib/law/client';
import type { LawArticle, LawDetail } from '@/lib/law/types';

/**
 * 법령 상세 XML 파싱 결과를 LawDetail로 변환
 * 기본정보 및 조문 데이터를 영문 인터페이스에 매핑
 */
export function parseLawDetailXml(parsed: Record<string, unknown>): LawDetail {
  const root = parsed.법령 as Record<string, unknown>;
  const info = root.기본정보 as Record<string, unknown>;
  const articlesRoot = root.조문 as Record<string, unknown> | undefined;

  const rawArticles = toArray(
    articlesRoot?.조문단위 as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  const articles: LawArticle[] = rawArticles.map((item) => ({
    articleNumber: String(item.조문번호 ?? ''),
    articleTitle: String(item.조문제목 ?? ''),
    articleContent: String(item.조문내용 ?? ''),
  }));

  return {
    lawId: String(info.법령ID ?? ''),
    lawNameKo: String(info.법령명_한글 ?? ''),
    lawType: String(info.법령구분 ?? ''),
    department: String(info.소관부처 ?? ''),
    promulgationDate: String(info.공포일자 ?? ''),
    enforcementDate: String(info.시행일자 ?? ''),
    articles,
  };
}

/**
 * 법령 상세 조회 실행
 * 클라이언트로 상세 URL 생성 후 API 호출 및 결과 파싱
 */
export async function getLawDetail(
  client: LawApiClient,
  lawId: string
): Promise<LawDetail> {
  const url = client.buildDetailUrl('law', lawId);
  const parsed = await client.fetchAndParse(url);
  return parseLawDetailXml(parsed as Record<string, unknown>);
}
