import { callMcpTool } from '@/lib/mcp/client';
import { extractToolResultText } from '@/lib/mcp/tool-bridge';
import { buildExternalUrl } from '@/lib/citation/builder';
import type { CitationType } from '@/lib/citation/types';

/** MCP 호출 타임아웃 (ms) */
const MCP_TIMEOUT = 10_000;

/** 타임아웃 부착 Promise */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('타임아웃')), ms),
    ),
  ]);
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
    let fullText = '';
    let name = id;
    let articleNumber = article;

    if (type === 'statute') {
      const mcpResult = await withTimeout(
        callMcpTool('get_law_detail', { lawId: id }),
        MCP_TIMEOUT,
      );
      const resultText = extractToolResultText(mcpResult);
      const parsed = JSON.parse(resultText) as Record<string, unknown>;
      name = String(parsed.lawNameKo ?? id);

      // 특정 조문 찾기
      if (article && Array.isArray(parsed.articles)) {
        const matched = parsed.articles.find(
          (a: Record<string, unknown>) => String(a.articleNumber) === article,
        );
        if (matched) {
          fullText = `${matched.articleTitle}\n${matched.articleContent}`;
          articleNumber = String(matched.articleNumber);
        }
      }

      if (!fullText && Array.isArray(parsed.articles)) {
        fullText = parsed.articles
          .slice(0, 5)
          .map((a: Record<string, unknown>) => `${a.articleTitle}: ${a.articleContent}`)
          .join('\n\n');
      }
    } else if (type === 'precedent') {
      const mcpResult = await withTimeout(
        callMcpTool('get_precedent_detail', { precedentId: id }),
        MCP_TIMEOUT,
      );
      const resultText = extractToolResultText(mcpResult);
      const parsed = JSON.parse(resultText) as Record<string, unknown>;
      name = String(parsed.caseName ?? id);
      fullText = String(parsed.fullText ?? parsed.summary ?? '');
    } else {
      // rule 타입은 현재 상세 조회 미지원
      fullText = '';
    }

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
  } catch {
    return Response.json(
      { success: false, error: '국가법령정보센터에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' },
      { status: 503 },
    );
  }
}
