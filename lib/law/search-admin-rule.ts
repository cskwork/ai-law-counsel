import { toArray } from '@/lib/utils/array';
import type { LawApiClient, SearchParams } from '@/lib/law/client';
import type { AdminRuleSearchItem, AdminRuleSearchResult } from '@/lib/law/types';

/**
 * 행정규칙 검색 XML 파싱 결과를 AdminRuleSearchResult로 변환
 * 한글 XML 필드명을 영문 인터페이스에 매핑
 */
export function parseAdminRuleSearchXml(
  parsed: Record<string, unknown>
): AdminRuleSearchResult {
  const root = parsed.AdmRulSearch as Record<string, unknown> | undefined;

  if (!root) {
    return { totalCount: 0, items: [] };
  }

  const totalCount = Number(root.totalCnt) || 0;
  const rawItems = toArray(
    root.admrul as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  const items: AdminRuleSearchItem[] = rawItems.map((item) => ({
    adminRuleId: String(item.행정규칙ID ?? ''),
    adminRuleName: String(item.행정규칙명 ?? ''),
    department: String(item.소관부처명 ?? ''),
    establishDate: String(item.제정일자 ?? ''),
    enforcementDate: String(item.시행일자 ?? ''),
  }));

  return { totalCount, items };
}

/**
 * 행정규칙 검색 실행
 * 클라이언트로 검색 URL 생성 후 API 호출 및 결과 파싱
 */
export async function searchAdminRule(
  client: LawApiClient,
  params: SearchParams
): Promise<AdminRuleSearchResult> {
  const url = client.buildSearchUrl('admrul', params);
  const parsed = await client.fetchAndParse(url);
  return parseAdminRuleSearchXml(parsed as Record<string, unknown>);
}
