import { toArray } from '@/lib/utils/array';
import type { LawApiClient, SearchParams } from '@/lib/law/client';
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

  const items: LawSearchItem[] = rawItems.map((item) => ({
    lawId: String(item.법령ID ?? ''),
    lawNameKo: String(item.법령명한글 ?? ''),
    lawAbbreviation: String(item.법령약칭명 ?? ''),
    lawType: String(item.법령구분명 ?? ''),
    department: String(item.소관부처명 ?? ''),
    promulgationDate: String(item.공포일자 ?? ''),
    promulgationNumber: String(item.공포번호 ?? ''),
    enforcementDate: String(item.시행일자 ?? ''),
    amendmentType: String(item.제개정구분명 ?? ''),
  }));

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
