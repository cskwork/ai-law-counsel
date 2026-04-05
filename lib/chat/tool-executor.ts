/**
 * 도구 실행기
 * - LLM 도구 호출을 파싱하여 해당 의존성 함수에 디스패치
 * - JSON 파싱 실패, 알 수 없는 도구, API 오류를 안전하게 처리
 */
import type { SearchParams } from '@/lib/law/client';
import type {
  LawSearchResult,
  LawDetail,
  PrecedentSearchResult,
  PrecedentDetail,
  AdminRuleSearchResult,
} from '@/lib/law/types';

/** 도구 실행에 필요한 의존성 인터페이스 */
export interface ToolExecutorDeps {
  searchLaw: (params: SearchParams) => Promise<LawSearchResult>;
  getLawDetail: (lawId: string) => Promise<LawDetail>;
  searchPrecedent: (params: SearchParams) => Promise<PrecedentSearchResult>;
  getPrecedentDetail: (precedentId: string) => Promise<PrecedentDetail>;
  searchAdminRule: (params: SearchParams) => Promise<AdminRuleSearchResult>;
}

/**
 * 도구 호출 실행
 * @param toolName - 도구 이름
 * @param argsJson - 도구 인자 JSON 문자열
 * @param deps - 외부 의존성 (API 클라이언트 함수들)
 * @returns 실행 결과 문자열 (JSON 또는 에러 메시지)
 */
export async function executeToolCall(
  toolName: string,
  argsJson: string,
  deps: ToolExecutorDeps,
): Promise<string> {
  // 1. JSON 파싱
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return `도구 인자 JSON 파싱 오류: ${argsJson}`;
  }

  // 2. 도구별 디스패치
  try {
    switch (toolName) {
      case 'search_law': {
        const params: SearchParams = { query: args.query as string };
        if (args.page !== undefined) {
          return JSON.stringify(
            await deps.searchLaw({ ...params, page: args.page as number }),
            null,
            2,
          );
        }
        return JSON.stringify(await deps.searchLaw(params), null, 2);
      }

      case 'get_law_detail': {
        const result = await deps.getLawDetail(args.lawId as string);
        return JSON.stringify(result, null, 2);
      }

      case 'search_precedent': {
        const result = await deps.searchPrecedent({ query: args.query as string });
        return JSON.stringify(result, null, 2);
      }

      case 'get_precedent_detail': {
        const result = await deps.getPrecedentDetail(args.precedentId as string);
        return JSON.stringify(result, null, 2);
      }

      case 'search_administrative_rule': {
        const result = await deps.searchAdminRule({ query: args.query as string });
        return JSON.stringify(result, null, 2);
      }

      case 'clarify_situation': {
        return `[추가 질문] ${args.question as string}`;
      }

      default:
        return `알 수 없는 도구: ${toolName}`;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `도구 실행 오류 (${toolName}): ${message}`;
  }
}
