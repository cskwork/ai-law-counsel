import type { LawApiClient } from '@/lib/law/client';
import type { PrecedentDetail } from '@/lib/law/types';

/**
 * 판례 상세 XML 파싱 결과를 PrecedentDetail로 변환
 * 한글 XML 필드명을 영문 인터페이스에 매핑
 */
export function parsePrecedentDetailXml(
  parsed: Record<string, unknown>
): PrecedentDetail {
  const root = parsed.PrecService as Record<string, unknown>;

  return {
    precedentId: String(root.판례정보일련번호 ?? ''),
    caseName: String(root.사건명 ?? ''),
    caseNumber: String(root.사건번호 ?? ''),
    judgmentDate: String(root.선고일자 ?? ''),
    judgment: String(root.선고 ?? ''),
    courtName: String(root.법원명 ?? ''),
    caseType: String(root.사건종류명 ?? ''),
    holding: String(root.판시사항 ?? ''),
    summary: String(root.판결요지 ?? ''),
    referenceArticles: String(root.참조조문 ?? ''),
    referencePrecedents: String(root.참조판례 ?? ''),
    fullText: String(root.판례내용 ?? ''),
  };
}

/**
 * 판례 상세 조회 실행
 * 클라이언트로 상세 URL 생성 후 API 호출 및 결과 파싱
 */
export async function getPrecedentDetail(
  client: LawApiClient,
  precedentId: string
): Promise<PrecedentDetail> {
  const url = client.buildDetailUrl('prec', precedentId);
  const parsed = await client.fetchAndParse(url);
  return parsePrecedentDetailXml(parsed as Record<string, unknown>);
}
