import { buildExternalUrl } from '@/lib/citation/builder';
import type { CitationType } from '@/lib/citation/types';
import { createLawApiClient } from '@/lib/law/client';
import { getLawDetail } from '@/lib/law/get-law-detail';
import { getPublicLawArticle } from '@/lib/law/get-public-law-article';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import { normalizeArticleNumber, toLawServiceArticleCode } from '@/lib/law/article-number';
import { searchLaw } from '@/lib/law/search-law';
import { searchPrecedent } from '@/lib/law/search-precedent';
import type { LawArticle } from '@/lib/law/types';

export const runtime = 'nodejs';
export const preferredRegion = 'icn1';
export const maxDuration = 15;

/** 조문번호 매칭 (다양한 형식 허용: "6의3", "6-3", "6조의3" 등) */
function matchArticle(articles: readonly LawArticle[], target: string): LawArticle | undefined {
  const normalizedTarget = normalizeArticleNumber(target) ?? target;

  return articles.find((article) => {
    const normalizedArticle = normalizeArticleNumber(article.articleNumber) ?? article.articleNumber;
    return normalizedArticle === normalizedTarget;
  });
}

function isDependencyFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' || err.message.includes('fetch failed') || err.message.includes('API 요청 실패');
}

function buildUnavailableResponse(
  type: CitationType,
  name: string,
  articleNumber?: string,
  externalUrl?: string,
) {
  return Response.json({
    success: true,
    data: {
      type,
      name,
      articleNumber,
      fullText: '국가법령정보센터 연결이 불안정하여 전문을 불러오지 못했습니다. 아래 링크에서 원문을 확인하세요.',
      externalUrl: externalUrl ?? buildExternalUrl(type, name, articleNumber),
      verified: false,
      fetchedAt: new Date().toISOString(),
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as CitationType | null;
  const id = url.searchParams.get('id');
  const article = url.searchParams.get('article') ?? undefined;
  const normalizedArticle = article ? normalizeArticleNumber(article) : undefined;

  if (!type || !id) {
    return Response.json(
      { success: false, error: '필수 파라미터가 누락되었습니다. (type, id)' },
      { status: 400 },
    );
  }

  let client;
  try {
    client = createLawApiClient();
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[citation] 설정 오류:', detail);
    return Response.json(
      { success: false, error: '인용 조회 설정이 올바르지 않습니다.' },
      { status: 503 },
    );
  }

  try {
    let fullText = '';
    let name = id;
    let articleNumber = normalizedArticle ?? article;
    let externalUrl = buildExternalUrl(type, id, articleNumber);

    if (type === 'statute') {
      // 1단계: 법령명으로 검색 → 법령 ID 해석
      const searchResult = await searchLaw(client, { query: id, display: 3 });
      const lawItem = searchResult.items[0];

      if (!lawItem) {
        return Response.json({
          success: true,
          data: {
            type,
            name: id,
            articleNumber,
            fullText: '해당 법령을 찾을 수 없습니다.',
            externalUrl,
            verified: false,
            fetchedAt: new Date().toISOString(),
          },
        });
      }

      name = lawItem.lawNameKo || id;
      externalUrl = lawItem.detailLink || externalUrl;

      // 2단계: 법령 ID + JO 단건 조회로 조문 전문 확보
      const detail = await getLawDetail(client, lawItem.lawId, {
        lawIdentifierType: 'ID',
        articleJo: article ? toLawServiceArticleCode(article) : undefined,
      });
      name = detail.lawNameKo || name;

      if (article && detail.articles.length > 0) {
        const matched = matchArticle(detail.articles, article)
          ?? (detail.articles.length === 1 ? detail.articles[0] : undefined);

        if (matched) {
          fullText = matched.articleTitle
            ? `${matched.articleTitle}\n${matched.articleContent}`
            : matched.articleContent;
          articleNumber = normalizeArticleNumber(matched.articleNumber) ?? matched.articleNumber;
        }
      }

      if (!fullText && detail.articles.length > 0) {
        fullText = detail.articles
          .slice(0, 5)
          .map((lawArticle) => lawArticle.articleTitle
            ? `${lawArticle.articleTitle}: ${lawArticle.articleContent}`
            : lawArticle.articleContent)
          .join('\n\n');
      }
    } else if (type === 'precedent') {
      // 1단계: 사건번호로 검색 → precedentId 해석
      const searchResult = await searchPrecedent(client, { query: id, display: 3 });
      const precItem = searchResult.items[0];

      if (precItem) {
        const detail = await getPrecedentDetail(client, precItem.precedentId);
        name = detail.caseName || id;
        fullText = detail.fullText || detail.summary || '';
      }
    }
    // rule 타입은 현재 상세 조회 미지원

    return Response.json({
      success: true,
      data: {
        type,
        name,
        articleNumber,
        fullText: fullText || '해당 내용을 찾을 수 없습니다.',
        externalUrl,
        verified: fullText.length > 0,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    if (isDependencyFailure(err)) {
      if (type === 'statute' && normalizedArticle) {
        try {
          const fallback = await getPublicLawArticle(id, normalizedArticle);

          return Response.json({
            success: true,
            data: {
              type,
              name: fallback.name,
              articleNumber: fallback.articleNumber,
              fullText: fallback.fullText,
              externalUrl: fallback.externalUrl,
              verified: true,
              fetchedAt: new Date().toISOString(),
            },
          });
        } catch (fallbackError: unknown) {
          const fallbackDetail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          console.error('[citation] 공개 페이지 fallback 실패:', fallbackDetail);
        }
      }

      return buildUnavailableResponse(type, id, normalizedArticle ?? article);
    }

    const detail = err instanceof Error ? err.message : String(err);
    console.error('[citation] 조회 실패:', detail);
    return Response.json(
      { success: false, error: '국가법령정보센터에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' },
      { status: 503 },
    );
  }
}
