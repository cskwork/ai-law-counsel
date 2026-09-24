/**
 * 국가법령정보센터 API 타입 정의
 */

/** 법령 검색 항목 */
export interface LawSearchItem {
  readonly lawId: string;
  readonly lawNameKo: string;
  readonly lawAbbreviation: string;
  readonly lawType: string;
  readonly department: string;
  readonly promulgationDate: string;
  readonly promulgationNumber: string;
  readonly enforcementDate: string;
  readonly amendmentType: string;
  readonly detailLink?: string;
}

/** 법령 검색 결과 */
export interface LawSearchResult {
  readonly totalCount: number;
  readonly items: readonly LawSearchItem[];
  /** 대체 검색을 사용한 경우 LLM에게 알리는 안내 */
  readonly searchNote?: string;
  /** 법령명 검색 실패 시 지능형 검색으로 찾은 관련 조문 */
  readonly relatedArticles?: readonly LawArticleSearchItem[];
}

/** 관련 조문 검색(지능형 검색) 항목 */
export interface LawArticleSearchItem {
  readonly lawId: string;
  readonly lawName: string;
  readonly lawType: string;
  /** 내부 표현 ("23", "43-2") */
  readonly articleNumber: string;
  readonly articleTitle: string;
  readonly articleContent: string;
  readonly enforcementDate: string;
}

/** 관련 조문 검색 결과 */
export interface LawArticleSearchResult {
  readonly totalCount: number;
  readonly items: readonly LawArticleSearchItem[];
}

/** 법령 조문 */
export interface LawArticle {
  readonly articleNumber: string;
  readonly articleTitle: string;
  readonly articleContent: string;
}

/** 법령 상세 정보 */
export interface LawDetail {
  readonly lawId: string;
  readonly lawNameKo: string;
  readonly lawType: string;
  readonly department: string;
  readonly promulgationDate: string;
  readonly enforcementDate: string;
  readonly articles: readonly LawArticle[];
  /** 조문 목차만 반환한 경우 등 LLM에게 알리는 안내 */
  readonly note?: string;
}

/** 판례 검색 항목 */
export interface PrecedentSearchItem {
  readonly precedentId: string;
  readonly caseName: string;
  readonly caseNumber: string;
  readonly judgmentDate: string;
  readonly judgment: string;
  readonly courtName: string;
  readonly caseType: string;
  readonly holding: string;
  readonly summary: string;
}

/** 판례 검색 결과 */
export interface PrecedentSearchResult {
  readonly totalCount: number;
  readonly items: readonly PrecedentSearchItem[];
  /** 대체 검색(본문 검색)을 사용한 경우 LLM에게 알리는 안내 */
  readonly searchNote?: string;
}

/** 판례 상세 정보 */
export interface PrecedentDetail extends PrecedentSearchItem {
  readonly referenceArticles: string;
  readonly referencePrecedents: string;
  readonly fullText: string;
}

/** 행정규칙 검색 항목 */
export interface AdminRuleSearchItem {
  readonly adminRuleId: string;
  readonly adminRuleName: string;
  readonly department: string;
  readonly establishDate: string;
  readonly enforcementDate: string;
}

/** 행정규칙 검색 결과 */
export interface AdminRuleSearchResult {
  readonly totalCount: number;
  readonly items: readonly AdminRuleSearchItem[];
}

/**
 * LawSearchResult 타입 가드
 * unknown 값이 LawSearchResult 구조인지 검증
 */
export function isLawSearchResult(value: unknown): value is LawSearchResult {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.totalCount === 'number' &&
    Array.isArray(candidate.items)
  );
}
