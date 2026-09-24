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

/**
 * 도구용 판례 검색 (대체 검색 포함)
 * - 기본 검색은 사건명만 대상으로 하므로 "근로기준법 제23조 부당해고"처럼 긴 질의는 0건이 된다.
 * - 0건이면 판결 본문 검색(search=2)으로 한 번 더 찾는다.
 */
export async function searchPrecedentWithFallback(
  client: LawApiClient,
  params: SearchParams,
): Promise<PrecedentSearchResult> {
  const query = params.query.trim();
  const byName = await searchPrecedent(client, { ...params, query });
  if (byName.totalCount > 0 || !query) {
    return byName;
  }

  const byBody = await searchPrecedent(client, { ...params, query, search: 2 });
  return {
    ...byBody,
    searchNote: `사건명에 "${query}"가 들어간 판례가 없어 판결 본문 검색 결과를 보여줍니다. 관련성이 낮을 수 있으니 짧은 핵심어(예: "부당해고")로 다시 검색하는 것도 방법입니다.`,
  };
}
