import {
  composeArticleNumber,
  formatArticleLabel,
  normalizeArticleNumber,
  toLawServiceArticleCode,
} from '@/lib/law/article-number';
import { pickLawByName, searchLaw } from '@/lib/law/search-law';
import { toArray } from '@/lib/utils/array';
import type { LawApiClient, LawDetailUrlOptions } from '@/lib/law/client';
import type { LawArticle, LawDetail } from '@/lib/law/types';

type XmlNode = Record<string, unknown>;

/** 속성이 붙은 XML 노드({ '#text': ... })와 일반 값을 모두 문자열로 변환 */
function textOf(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && !Array.isArray(value)) {
    return textOf((value as XmlNode)['#text']);
  }
  if (Array.isArray(value)) {
    return value.map(textOf).filter(Boolean).join('\n');
  }
  return String(value).trim();
}

function nodes(value: unknown): XmlNode[] {
  return toArray(value as XmlNode | XmlNode[] | undefined).filter(
    (node): node is XmlNode => typeof node === 'object' && node !== null,
  );
}

/**
 * 조문 본문 조립
 * - API는 조문내용에 "제23조(해고 등의 제한)" 같은 머리글만 담고,
 *   실제 본문은 항 > 호 > 목 하위 요소에 나누어 준다. 모두 이어 붙여야 조문 전문이 된다.
 */
function composeArticleContent(item: XmlNode): string {
  const lines: string[] = [];
  const head = textOf(item.조문내용);
  if (head) lines.push(head);

  for (const paragraph of nodes(item.항)) {
    const paragraphText = textOf(paragraph.항내용);
    if (paragraphText) lines.push(paragraphText);

    for (const subparagraph of nodes(paragraph.호)) {
      const subText = textOf(subparagraph.호내용);
      if (subText) lines.push(subText);

      for (const item3 of nodes(subparagraph.목)) {
        const itemText = textOf(item3.목내용);
        if (itemText) lines.push(itemText);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 법령 상세 XML 파싱 결과를 LawDetail로 변환
 * 기본정보 및 조문 데이터를 영문 인터페이스에 매핑
 * - 장·절 제목(조문여부 = 전문)은 조문이 아니므로 제외
 */
export function parseLawDetailXml(parsed: Record<string, unknown>): LawDetail {
  const root = parsed.법령 as Record<string, unknown>;
  const info = root.기본정보 as Record<string, unknown>;
  const articlesRoot = root.조문 as Record<string, unknown> | undefined;

  const rawArticles = nodes(articlesRoot?.조문단위).filter(
    (item) => textOf(item.조문여부) !== '전문',
  );

  const articles: LawArticle[] = rawArticles.map((item) => ({
    articleNumber: composeArticleNumber(
      item.조문번호 as string | number | undefined,
      item.조문가지번호 as string | number | undefined,
    ) ?? String(item.조문번호 ?? ''),
    articleTitle: textOf(item.조문제목),
    articleContent: composeArticleContent(item),
  }));

  return {
    lawId: textOf(info.법령ID),
    lawNameKo: textOf(info.법령명_한글),
    lawType: textOf(info.법령구분) || textOf(info.법종구분),
    department: textOf(info.소관부처),
    promulgationDate: textOf(info.공포일자),
    enforcementDate: textOf(info.시행일자),
    articles,
  };
}

/**
 * 법령 상세 조회 실행
 * 클라이언트로 상세 URL 생성 후 API 호출 및 결과 파싱
 */
export async function getLawDetail(
  client: LawApiClient,
  lawId: string,
  options: LawDetailUrlOptions = {},
): Promise<LawDetail> {
  const url = client.buildDetailUrl('law', lawId, {
    lawIdentifierType: options.lawIdentifierType ?? 'ID',
    articleJo: options.articleJo,
  });
  const parsed = await client.fetchAndParse(url);
  return parseLawDetailXml(parsed as Record<string, unknown>);
}

/** 한 번에 조회할 수 있는 최대 조문 수 */
export const MAX_ARTICLES_PER_REQUEST = 6;

/** 조문 번호를 지정하지 않았을 때 목차로 보여줄 최대 조문 수 */
const MAX_INDEX_ARTICLES = 300;

export interface LawArticlesRequest {
  readonly lawId?: string;
  readonly lawName?: string;
  /** "23", "제28조", "43의2" 등 */
  readonly articles?: readonly string[];
}

/** 조문 번호 입력을 배열로 정규화 ("23, 28" 같은 문자열도 허용) */
export function normalizeArticleList(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input.map((value) => String(value))
    : typeof input === 'string' || typeof input === 'number'
      ? String(input).split(/[,，、\s]+/)
      : [];

  const normalized = raw
    .map((value) => normalizeArticleNumber(value.trim()))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

/** 법령명으로 법령 ID 확인 (정확히 일치하는 이름 우선) */
async function resolveLawId(client: LawApiClient, lawName: string): Promise<string | undefined> {
  const result = await searchLaw(client, { query: lawName, display: 20 });
  return pickLawByName(result.items, lawName)?.lawId || undefined;
}

/**
 * 도구용 법령 조문 조회
 * - articles를 주면 해당 조문만 JO 단건 조회로 가져온다 (본문 포함)
 * - articles가 없으면 법령 전체 본문(수십만 자) 대신 조문 목차(번호·제목)만 돌려준다
 */
export async function getLawArticles(
  client: LawApiClient,
  request: LawArticlesRequest,
): Promise<LawDetail> {
  const lawId = request.lawId?.trim()
    || (request.lawName ? await resolveLawId(client, request.lawName.trim()) : undefined);

  if (!lawId) {
    throw new Error(`법령을 찾을 수 없습니다: ${request.lawName ?? '(법령 ID/이름 없음)'}`);
  }

  const articleNumbers = (request.articles ?? []).slice(0, MAX_ARTICLES_PER_REQUEST);

  if (articleNumbers.length === 0) {
    const detail = await getLawDetail(client, lawId);
    return {
      ...detail,
      articles: detail.articles.slice(0, MAX_INDEX_ARTICLES).map((article) => ({
        articleNumber: article.articleNumber,
        articleTitle: article.articleTitle,
        articleContent: '',
      })),
      note: '조문 목차(번호·제목)만 표시했습니다. 본문이 필요한 조문은 articles 인자에 조문 번호를 넣어 다시 조회하세요.',
    };
  }

  const details = await Promise.all(
    articleNumbers.map((articleNumber) =>
      getLawDetail(client, lawId, { articleJo: toLawServiceArticleCode(articleNumber) }),
    ),
  );

  const found: LawArticle[] = [];
  const missing: string[] = [];
  articleNumbers.forEach((articleNumber, index) => {
    const match = details[index].articles.find(
      (article) => normalizeArticleNumber(article.articleNumber) === articleNumber,
    );
    if (match) {
      found.push(match);
    } else {
      missing.push(formatArticleLabel(articleNumber) ?? articleNumber);
    }
  });

  const base = details[0];
  return {
    ...base,
    articles: found,
    ...(missing.length > 0 ? { note: `다음 조문은 찾지 못했습니다: ${missing.join(', ')}` } : {}),
  };
}
