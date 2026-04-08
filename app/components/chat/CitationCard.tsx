'use client';

import { useState, useCallback } from 'react';
import type { CitationResponse } from '@/lib/citation/types';

interface CitationCardProps {
  /** cite: 프로토콜 URL (예: cite:statute/민법/750) */
  citeUrl: string;
  /** 인용 표시 텍스트 */
  children: React.ReactNode;
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
      const body: CitationResponse = await response.json();

      if (body.success && body.data) {
        setData(body.data);
      } else {
        setError(body.error ?? '인용 정보를 가져올 수 없습니다.');
      }
    } catch {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [expanded, data, citeUrl]);

  return (
    <span className="inline">
      <button
        onClick={handleClick}
        className="inline text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2 cursor-pointer font-medium"
        title="클릭하여 조문 전문 보기"
      >
        {children}
      </button>

      {expanded && (
        <span className="block my-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm shadow-sm">
          {loading && (
            <span className="flex items-center gap-2 text-zinc-500">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              조문 조회 중...
            </span>
          )}

          {error && (
            <span className="text-red-500">{error}</span>
          )}

          {data && !loading && (
            <span className="block space-y-2">
              <span className="block font-semibold text-zinc-800">
                {data.name}
                {data.articleNumber && ` 제${data.articleNumber}조`}
              </span>
              <span className="block whitespace-pre-wrap text-zinc-600 leading-relaxed">
                {data.fullText}
              </span>
              <span className="flex items-center gap-3 pt-1">
                <a
                  href={data.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  law.go.kr에서 보기
                </a>
                {data.verified ? (
                  <span className="text-xs text-green-600">검증됨</span>
                ) : (
                  <span className="text-xs text-amber-600">검증 대기 중</span>
                )}
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
