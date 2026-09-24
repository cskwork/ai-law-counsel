import type { SourceItem } from '@/lib/utils/sse';

const TYPE_CONFIG: Record<SourceItem['type'], { label: string; lineClass: string; textClass: string }> = {
  law: { label: '법령', lineClass: 'bg-way-law', textClass: 'text-way-law' },
  precedent: { label: '판례', lineClass: 'bg-way-precedent', textClass: 'text-way-precedent' },
  admin_rule: { label: '행정규칙', lineClass: 'bg-way-admin', textClass: 'text-way-admin-ink' },
};

interface SourcesFooterProps {
  sources: SourceItem[];
}

// 근거 목록: 답변 문서에 첨부되는 출처 대장 (안내선 색으로 유형 구분)
export function SourcesFooter({ sources }: SourcesFooterProps) {
  if (sources.length === 0) return null;

  return (
    <section aria-label="참조 출처" className="animate-settle">
      <div className="rounded-[4px] border border-rule bg-paper-2 px-4 py-3 sm:px-5">
        <h3 className="mb-2 flex items-baseline gap-2 font-sign text-[0.8rem] font-bold text-ink">
          참조 출처
          <span className="tabular font-body text-xs font-normal text-ink-3">{sources.length}건</span>
        </h3>
        <ul className="divide-y divide-rule">
          {sources.map((source) => {
            const config = TYPE_CONFIG[source.type];
            return (
              <li key={`${source.type}:${source.identifier}`} className="flex items-start gap-3 py-2 text-[0.83rem]">
                <span className={`flex w-16 shrink-0 items-center gap-1.5 pt-0.5 text-xs font-bold ${config.textClass}`}>
                  <span aria-hidden="true" className={`h-1.5 w-3 rounded-full ${config.lineClass}`} />
                  {config.label}
                </span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 leading-5 text-ink underline decoration-rule-strong underline-offset-[3px] transition-colors hover:text-way-law hover:decoration-way-law"
                  >
                    <span className="min-w-0 break-words">{source.name}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-2.5 w-2.5 shrink-0 opacity-60" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 2.5h5v5M9.5 2.5 3 9" />
                    </svg>
                    <span className="sr-only">(새 창)</span>
                  </a>
                ) : (
                  <span className="leading-5 text-ink-2">
                    {source.name}
                    <span className="tabular ml-1 text-ink-3">({source.identifier})</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
