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
        type="button"
        onClick={handleClick}
        aria-expanded={expanded}
        className="inline cursor-pointer rounded-[2px] bg-way-law-tint px-0.5 font-medium text-way-law underline decoration-way-law/50 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-solid"
        title="클릭하여 조문 전문 보기"
      >
        {children}
      </button>

      {expanded && (
        <span className="my-3 block rounded-[4px] border border-rule bg-paper-2 p-4 text-sm not-prose animate-feed">
          {loading && (
            <span className="flex items-center gap-2 text-ink-3" role="status">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              조문 조회 중...
            </span>
          )}

          {error && (
            <span className="text-error" role="alert">{error}</span>
          )}

          {data && !loading && (
            <span className="block space-y-2.5">
              <span className="flex items-start justify-between gap-3">
                <span className="block font-sign text-[0.95rem] font-bold text-ink">
                  {data.name}
                  {articleLabel && ` ${articleLabel}`}
                </span>
                {data.verified ? (
                  <span className="stamp animate-stamp inline-flex shrink-0 items-center gap-1 px-2 py-0.5 font-sign text-[0.7rem] font-extrabold text-ok">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    검증됨
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-[3px] border border-dashed border-warn/70 bg-warn-tint px-2 py-0.5 font-sign text-[0.7rem] font-bold text-warn"
                    title="공식 원문과 자동 대조가 아직 완료되지 않았습니다. 아래 원문을 직접 확인하세요."
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    검증 대기 중
                  </span>
                )}
              </span>
              <span className="block whitespace-pre-wrap leading-relaxed text-ink-2">
                {data.fullText}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-rule pt-2.5">
                <span className="text-xs text-ink-3">
                  AI 요약과 아래 공식 원문을 직접 대조하세요.
                </span>
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded-[3px] border border-sign px-2.5 py-1 font-sign text-xs font-bold text-sign transition-colors hover:bg-sign hover:text-sign-ink"
                >
                  law.go.kr에서 보기
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-2.5 w-2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 2.5h5v5M9.5 2.5 3 9" />
                  </svg>
                </a>
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
