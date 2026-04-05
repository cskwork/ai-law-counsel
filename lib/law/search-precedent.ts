import { toArray } from '@/lib/utils/array';
import type { LawApiClient, SearchParams } from '@/lib/law/client';
import type { PrecedentSearchItem, PrecedentSearchResult } from '@/lib/law/types';

/**
 * 판례 검색 XML 파싱 결과를 PrecedentSearchResult로 변환
 * 한글 XML 필드명을 영문 인터페이스에 매핑
 */
export function parsePrecedentSearchXml(
  parsed: Record<string, unknown>
): PrecedentSearchResult {
  const root = parsed.PrecSearch as Record<string, unknown> | undefined;

  if (!root) {
    return { totalCount: 0, items: [] };
  }

  const totalCount = Number(root.totalCnt) || 0;
  const rawItems = toArray(
    root.prec as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  const items: PrecedentSearchItem[] = rawItems.map((item) => ({
    precedentId: String(item.판례일련번호 ?? ''),
    caseName: String(item.사건명 ?? ''),
    caseNumber: String(item.사건번호 ?? ''),
    judgmentDate: String(item.선고일자 ?? ''),
    judgment: String(item.선고 ?? ''),
    courtName: String(item.법원명 ?? ''),
    caseType: String(item.사건종류명 ?? ''),
    holding: String(item.판시사항 ?? ''),
    summary: String(item.판결요지 ?? ''),
  }));

  return { totalCount, items };
}

/**
 * 판례 검색 실행
 * 클라이언트로 검색 URL 생성 후 API 호출 및 결과 파싱
 */
export async function searchPrecedent(
  client: LawApiClient,
  params: SearchParams
): Promise<PrecedentSearchResult> {
  const url = client.buildSearchUrl('prec', params);
  const parsed = await client.fetchAndParse(url);
  return parsePrecedentSearchXml(parsed as Record<string, unknown>);
}
