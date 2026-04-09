/**
 * 법령 조문 번호를 API/표시용 공통 형식으로 정규화
 * - canonical: "8", "3-2"
 * - label: "제8조", "제3조의2"
 * - JO: "000800", "000302"
 */

function trimLeadingZeros(value: string): string {
  const normalized = value.replace(/^0+/, '');
  return normalized === '' ? '0' : normalized;
}

/**
 * 사용자가 입력하거나 API가 반환한 조문 번호를 "3-2" 같은 내부 표현으로 변환
 */
export function normalizeArticleNumber(input: string): string | undefined {
  const compact = input.replace(/\s+/g, '');
  if (!compact) return undefined;

  const normalized = compact
    .replace(/^제/, '')
    .replace(/조의/g, '의')
    .replace(/-/g, '의')
    .replace(/조$/, '');

  const match = normalized.match(/^(\d+)(?:의(\d+))?$/);
  if (!match) return undefined;

  const article = trimLeadingZeros(match[1]);
  const subArticle = match[2] ? trimLeadingZeros(match[2]) : undefined;

  return subArticle ? `${article}-${subArticle}` : article;
}

/**
 * API 필드(조문번호/조문가지번호)에서 내부 표현을 조합
 */
export function composeArticleNumber(
  articleNumber: string | number | undefined,
  subArticleNumber?: string | number | undefined,
): string | undefined {
  if (articleNumber === undefined || articleNumber === null) {
    return undefined;
  }

  const rawArticle = String(articleNumber).trim();
  if (!rawArticle) return undefined;

  if (/[제조의-]/.test(rawArticle)) {
    return normalizeArticleNumber(rawArticle);
  }

  const article = trimLeadingZeros(rawArticle);
  const rawSubArticle = subArticleNumber === undefined || subArticleNumber === null
    ? ''
    : String(subArticleNumber).trim();

  if (!rawSubArticle || rawSubArticle === '0' || rawSubArticle === '00') {
    return article;
  }

  return `${article}-${trimLeadingZeros(rawSubArticle)}`;
}

/**
 * 조문 번호를 사람이 읽는 라벨로 변환
 */
export function formatArticleLabel(input: string): string | undefined {
  const normalized = normalizeArticleNumber(input);
  if (!normalized) return undefined;

  const [article, subArticle] = normalized.split('-');
  return subArticle ? `제${article}조의${subArticle}` : `제${article}조`;
}

/**
 * 국가법령정보센터 lawService.do의 JO 파라미터(6자리)로 변환
 */
export function toLawServiceArticleCode(input: string): string | undefined {
  const normalized = normalizeArticleNumber(input);
  if (!normalized) return undefined;

  const [article, subArticle] = normalized.split('-');
  return article.padStart(4, '0') + (subArticle ?? '0').padStart(2, '0');
}
