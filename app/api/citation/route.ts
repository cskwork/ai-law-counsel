import { createLawApiClient } from '@/lib/law/client';
import { searchLaw } from '@/lib/law/search-law';
import { getLawDetail } from '@/lib/law/get-law-detail';
import { searchPrecedent } from '@/lib/law/search-precedent';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import { buildExternalUrl } from '@/lib/citation/builder';
import type { CitationType } from '@/lib/citation/types';
import type { LawArticle } from '@/lib/law/types';

/** 조문번호 매칭 (다양한 형식 허용: "6의3", "6-3", "6조의3" 등) */
function matchArticle(articles: readonly LawArticle[], target: string): LawArticle | undefined {
  const normalized = target.replace(/조$/, '');
  return articles.find((a) => {
    const num = a.articleNumber.replace(/조$/, '');
    return num === normalized;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as CitationType | null;
  const id = url.searchParams.get('id');
  const article = url.searchParams.get('article') ?? undefined;

  if (!type || !id) {
    return Response.json(
      { success: false, error: '필수 파라미터가 누락되었습니다. (type, id)' },
      { status: 400 },
    );
  }

  try {
    const client = createLawApiClient();
    let fullText = '';
    let name = id;
    let articleNumber = article;

    if (type === 'statute') {
      // 1단계: 법령명으로 검색 → MST ID 해석
      const searchResult = await searchLaw(client, { query: id, display: 3 });
      const lawItem = searchResult.items[0];

      if (!lawItem) {
        return Response.json({
          success: true,
          data: {
            type, name: id, articleNumber: article,
            fullText: '해당 법령을 찾을 수 없습니다.',
            externalUrl: buildExternalUrl(type, id, article),
            verified: false,
            fetchedAt: new Date().toISOString(),
          },
        });
      }

      name = lawItem.lawNameKo || id;

      // 2단계: 실제 MST ID로 상세 조회
      const detail = await getLawDetail(client, lawItem.lawId);
      name = detail.lawNameKo || name;

      // 특정 조문 찾기
      if (article && detail.articles.length > 0) {
        const matched = matchArticle(detail.articles, article);
        if (matched) {
          fullText = matched.articleTitle
            ? `${matched.articleTitle}\n${matched.articleContent}`
            : matched.articleContent;
          articleNumber = matched.articleNumber;
        }
      }

      // 조문 미매칭 시 처음 5개 표시
      if (!fullText && detail.articles.length > 0) {
        fullText = detail.articles
          .slice(0, 5)
          .map((a) => a.articleTitle ? `${a.articleTitle}: ${a.articleContent}` : a.articleContent)
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

    const externalUrl = buildExternalUrl(type, name, articleNumber);

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
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[citation] 조회 실패:', detail);
    return Response.json(
      { success: false, error: '국가법령정보센터에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', detail },
      { status: 503 },
    );
  }
}
