import { formatArticleLabel } from '@/lib/law/article-number';
import type { CitationType } from './types';

const LAW_GO_KR_BASE = 'https://www.law.go.kr';

/** 법령 페이지 URL 생성 (한글주소 형식) */
export function buildStatuteUrl(lawName: string, articleNumber?: string): string {
  const base = `${LAW_GO_KR_BASE}/법령/${encodeURIComponent(lawName)}`;
  const articleLabel = articleNumber ? formatArticleLabel(articleNumber) : undefined;
  if (articleLabel) {
    return `${base}/${encodeURIComponent(articleLabel)}`;
  }
  return base;
}

/** 판례 검색 URL 생성 */
export function buildPrecedentUrl(caseNumber: string): string {
  return `${LAW_GO_KR_BASE}/precSc.do?query=${encodeURIComponent(caseNumber)}`;
}

/** 행정규칙 URL 생성 */
function buildRuleUrl(ruleName: string): string {
  return `${LAW_GO_KR_BASE}/행정규칙/${encodeURIComponent(ruleName)}`;
}

/** 인용 타입별 외부 URL 통합 생성 */
export function buildExternalUrl(
  type: CitationType,
  nameOrIdentifier: string,
  articleNumber?: string,
): string {
  switch (type) {
    case 'statute':
      return buildStatuteUrl(nameOrIdentifier, articleNumber);
    case 'precedent':
      return buildPrecedentUrl(nameOrIdentifier);
    case 'rule':
      return buildRuleUrl(nameOrIdentifier);
  }
}
