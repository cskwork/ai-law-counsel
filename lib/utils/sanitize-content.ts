/**
 * LLM 응답의 HTML 태그를 Markdown 등가물로 변환
 * react-markdown이 HTML을 이스케이프하므로 렌더링 전 사전 정리 필요
 */

const HTML_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  // 줄바꿈: <br>, <br/>, <br />, 속성 포함
  [/<br[^>]*\/?>/gi, '\n'],

  // 단락 경계: </p><p> -> 이중 줄바꿈 (단독 태그보다 먼저 처리)
  [/<\/p>\s*<p[^>]*>/gi, '\n\n'],
  [/<\/?p[^>]*>/gi, '\n\n'],

  // 볼드: <b>/<strong> -> **text**
  [/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '**$2**'],

  // 이탤릭: <i>/<em> -> *text*
  [/<(i|em)[^>]*>(.*?)<\/\1>/gi, '*$2*'],

  // 밑줄: Markdown 등가물 없음, 태그만 제거
  [/<\/?u[^>]*>/gi, ''],

  // 제목: <h1>~<h4>
  [/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n'],
  [/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n'],
  [/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n'],
  [/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n'],

  // 수평선: <hr>
  [/<hr[^>]*\/?>/gi, '\n---\n'],

  // 과도한 줄바꿈 정리 (3개 이상 -> 2개)
  [/\n{3,}/g, '\n\n'],
];

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeCiteUrl(url: string): string {
  if (!url.startsWith('cite:')) return url;

  const segments = url.replace('cite:', '').split('/');
  if (segments.length < 2) return url;

  const [type, ...rest] = segments;
  const encodedSegments = rest.map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)));

  return `cite:${[type, ...encodedSegments].join('/')}`;
}

/** 공백이 포함된 cite: 링크를 마크다운 파서가 읽을 수 있는 형태로 정규화 */
function normalizeCitationMarkdownLinks(content: string): string {
  return content.replace(
    /\[([^\]]+)\]\((cite:[^)]+)\)/g,
    (_match, label: string, url: string) => `[${label}](${normalizeCiteUrl(url)})`,
  );
}

export function sanitizeContent(content: string): string {
  let result = content;
  for (const [pattern, replacement] of HTML_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return normalizeCitationMarkdownLinks(result).trim();
}
