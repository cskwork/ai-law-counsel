'use client';

import { useState, useCallback } from 'react';
import type { CitationResponse } from '@/lib/citation/types';
import { formatArticleLabel } from '@/lib/law/article-number';

interface CitationCardProps {
  /** cite: 프로토콜 URL (예: cite:statute/민법/750) */
  citeUrl: string;
  /** 인용 표시 텍스트 */
  children: React.ReactNode;
}

async function parseCitationResponse(response: Response): Promise<CitationResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return { success: false, error: '인용 응답이 비어 있습니다.' };
  }

  try {
    return JSON.parse(text) as CitationResponse;
  } catch {
    throw new Error('INVALID_CITATION_RESPONSE');
  }
}

/** cite: URL에서 타입, ID, 조문번호를 파싱 */
function parseCiteUrl(url: string): { type: string; id: string; article?: string } | null {
  // 형식: cite:statute/법령명/조번호 또는 cite:precedent/판례번호
  const parts = url.replace('cite:', '').split('/');
  if (parts.length < 2) return null;
  return {
    type: parts[0],
    id: decodeURIComponent(parts[1]),
    article: parts[2] ? decodeURIComponent(parts[2]) : undefined,
  };
}

// 인터랙티브 인용 카드 (클릭 시 조문 전문 + 외부 링크)
export function CitationCard({ citeUrl, children }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CitationResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const articleLabel = data?.articleNumber ? formatArticleLabel(data.articleNumber) : undefined;

  const handleClick = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    // 이미 데이터가 있으면 재요청 안 함
    if (data) return;

    const parsed = parseCiteUrl(citeUrl);
    if (!parsed) {
      setError('잘못된 인용 형식입니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type: parsed.type, id: parsed.id });
      if (parsed.article) params.set('article', parsed.article);

      const response = await fetch(`/api/citation?${params}`);
      const body = await parseCitationResponse(response);

      if (response.ok && body.success && body.data) {
        setData(body.data);
      } else {
        setError(body.error ?? '인용 정보를 가져올 수 없습니다.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_CITATION_RESPONSE') {
        setError('인용 서비스 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('서버 연결에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [expanded, data, citeUrl]);

  return (
    <span className="inline">
      <button
        onClick={handleClick}
        className="inline text-authority-mid hover:text-authority-deep underline decoration-dotted decoration-accent-gold underline-offset-2 cursor-pointer font-medium transition-colors"
        title="클릭하여 조문 전문 보기"
      >
        {children}
      </button>

      {expanded && (
        <span className="block my-2 border-l-[3px] border-accent-gold bg-surface-elevated p-4 text-sm">
          {loading && (
            <span className="flex items-center gap-2 text-ink-tertiary">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              조문 조회 중...
            </span>
          )}

          {error && (
            <span className="text-status-error">{error}</span>
          )}

          {data && !loading && (
            <span className="block space-y-2">
              <span className="block font-display font-semibold text-ink-primary">
                {data.name}
                {articleLabel && ` ${articleLabel}`}
              </span>
              <span className="block whitespace-pre-wrap text-ink-secondary leading-relaxed">
                {data.fullText}
              </span>
              <span className="flex items-center gap-3 pt-1">
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-authority-deep px-2 py-1 text-xs text-authority-deep hover:bg-authority-deep hover:text-ink-inverse transition-colors"
                >
                  law.go.kr에서 보기
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                    <path d="M3.5 1.75a.75.75 0 0 0 0 1.5h3.69L1.22 9.22a.75.75 0 1 0 1.06 1.06l5.97-5.97V8a.75.75 0 0 0 1.5 0V2.5a.75.75 0 0 0-.75-.75h-5.5Z" />
                  </svg>
                </a>
                {data.verified ? (
                  <span className="flex items-center gap-1 text-xs text-status-success">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-accent-gold">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    검증됨
                  </span>
                ) : (
                  <span className="text-xs text-status-warning">검증 대기 중</span>
                )}
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
