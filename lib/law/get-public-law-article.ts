import { buildExternalUrl } from '@/lib/citation/builder';
import { formatArticleLabel, normalizeArticleNumber } from '@/lib/law/article-number';

const LAW_PUBLIC_BASE_URL = 'https://www.law.go.kr';

const HTML_ENTITY_MAP: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&nbsp;': ' ',
};

export interface PublicLawArticleDetail {
  readonly name: string;
  readonly articleNumber?: string;
  readonly fullText: string;
  readonly externalUrl: string;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractIframeSrc(html: string): string | undefined {
  const match = html.match(/<iframe[^>]+src="([^"]*lsInfoP\.do[^"]*)"/i);
  if (!match) return undefined;
  return decodeHtmlEntities(match[1]);
}

function buildPublicBodyUrl(lawName: string, iframeSrc: string): URL {
  const iframeUrl = new URL(iframeSrc, LAW_PUBLIC_BASE_URL);
  const bodyUrl = new URL('/LSW//lsInfoR.do', LAW_PUBLIC_BASE_URL);

  bodyUrl.searchParams.set('lsiSeq', iframeUrl.searchParams.get('lsiSeq') ?? '');
  bodyUrl.searchParams.set('efYd', iframeUrl.searchParams.get('efYd') ?? '');
  bodyUrl.searchParams.set('efYn', 'Y');
  bodyUrl.searchParams.set('chrClsCd', iframeUrl.searchParams.get('chrClsCd') ?? '010202');
  bodyUrl.searchParams.set('nwJoYnInfo', 'Y');
  bodyUrl.searchParams.set('ancYnChk', iframeUrl.searchParams.get('ancYnChk') ?? '0');
  bodyUrl.searchParams.set('netPrivateYn', 'N');

  if (!bodyUrl.searchParams.get('lsiSeq') || !bodyUrl.searchParams.get('efYd')) {
    throw new Error(`공개 법령 페이지 파라미터 추출 실패: ${lawName}`);
  }

  return bodyUrl;
}

function extractArticleSection(bodyHtml: string, articleLabel: string): string | undefined {
  const articleStartPattern = /<p[^>]*class="pty1_p4"[^>]*>/gi;
  const startMatches = Array.from(bodyHtml.matchAll(articleStartPattern));

  for (let index = 0; index < startMatches.length; index++) {
    const start = startMatches[index].index;
    if (start === undefined) continue;

    const firstBlockEnd = bodyHtml.indexOf('</p>', start);
    if (firstBlockEnd === -1) continue;

    const firstBlockHtml = bodyHtml.slice(start, firstBlockEnd + 4);
    const firstBlockText = stripHtml(firstBlockHtml);

    if (!firstBlockText.startsWith(articleLabel)) {
      continue;
    }

    const nextStart = startMatches[index + 1]?.index ?? bodyHtml.length;
    return bodyHtml.slice(start, nextStart);
  }

  return undefined;
}

function extractArticleText(sectionHtml: string, articleLabel: string): string | undefined {
  const paragraphMatches = Array.from(sectionHtml.matchAll(/<p[^>]*>[\s\S]*?<\/p>/gi));
  const paragraphs = paragraphMatches
    .map((match) => stripHtml(match[0]))
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return undefined;
  }

  const titlePattern = new RegExp(`^${escapeRegExp(articleLabel)}(?:\\(([^)]+)\\))?\\s*(.*)$`);
  const firstParagraph = paragraphs[0];
  const firstMatch = firstParagraph.match(titlePattern);

  const lines: string[] = [];
  if (firstMatch) {
    const [, title, body] = firstMatch;
    if (title) lines.push(title);
    if (body) lines.push(body);
  } else {
    lines.push(firstParagraph);
  }

  lines.push(...paragraphs.slice(1));

  return lines.join('\n').trim();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`공개 법령 페이지 요청 실패: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

export async function getPublicLawArticle(
  lawName: string,
  articleNumber?: string,
): Promise<PublicLawArticleDetail> {
  const wrapperUrl = `${LAW_PUBLIC_BASE_URL}/법령/${encodeURIComponent(lawName)}`;
  const wrapperHtml = await fetchText(wrapperUrl);
  const iframeSrc = extractIframeSrc(wrapperHtml);

  if (!iframeSrc) {
    throw new Error(`공개 법령 iframe 추출 실패: ${lawName}`);
  }

  const bodyUrl = buildPublicBodyUrl(lawName, iframeSrc);
  const bodyHtml = await fetchText(bodyUrl.toString());

  const normalizedArticle = articleNumber ? normalizeArticleNumber(articleNumber) : undefined;
  const articleLabel = normalizedArticle ? formatArticleLabel(normalizedArticle) : undefined;

  if (articleLabel) {
    const sectionHtml = extractArticleSection(bodyHtml, articleLabel);
    if (!sectionHtml) {
      throw new Error(`공개 법령 조문 추출 실패: ${lawName} ${articleLabel}`);
    }

    const fullText = extractArticleText(sectionHtml, articleLabel);
    if (!fullText) {
      throw new Error(`공개 법령 조문 본문 추출 실패: ${lawName} ${articleLabel}`);
    }

    return {
      name: lawName,
      articleNumber: normalizedArticle,
      fullText,
      externalUrl: buildExternalUrl('statute', lawName, normalizedArticle),
    };
  }

  throw new Error(`공개 법령 fallback은 조문 번호가 필요합니다: ${lawName}`);
}

export const __testables = {
  buildPublicBodyUrl,
  decodeHtmlEntities,
  extractArticleSection,
  extractArticleText,
  extractIframeSrc,
  stripHtml,
};
