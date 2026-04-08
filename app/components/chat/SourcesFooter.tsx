import type { SourceItem } from '@/lib/utils/sse';

const TYPE_CONFIG: Record<SourceItem['type'], { label: string; bgClass: string; textClass: string }> = {
  law: { label: '법령', bgClass: 'bg-cite-law-bg', textClass: 'text-cite-law' },
  precedent: { label: '판례', bgClass: 'bg-cite-precedent-bg', textClass: 'text-cite-precedent' },
  admin_rule: { label: '행정규칙', bgClass: 'bg-cite-admin-bg', textClass: 'text-cite-admin' },
};

interface SourcesFooterProps {
  sources: SourceItem[];
}

// 참조 출처 표시 (항상 펼쳐진 수평선 섹션)
export function SourcesFooter({ sources }: SourcesFooterProps) {
  if (sources.length === 0) return null;

  return (
    <div className="my-3 animate-settle">
      <div className="max-w-[92%] sm:max-w-[85%] lg:max-w-[80%] pl-5">
        <div className="border-t border-border-default pt-3">
          <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary mb-2">
            참조 출처
          </p>
          <ul className="space-y-1.5">
            {sources.map((source) => {
              const config = TYPE_CONFIG[source.type];
              return (
                <li key={`${source.type}:${source.identifier}`} className="flex items-start gap-2 text-xs">
                  <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bgClass} ${config.textClass}`}>
                    {config.label}
                  </span>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leading-5 text-authority-mid hover:text-authority-deep hover:underline transition-colors inline-flex items-center gap-1"
                    >
                      {source.name}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 opacity-50">
                        <path d="M3.5 1.75a.75.75 0 0 0 0 1.5h3.69L1.22 9.22a.75.75 0 1 0 1.06 1.06l5.97-5.97V8a.75.75 0 0 0 1.5 0V2.5a.75.75 0 0 0-.75-.75h-5.5Z" />
                      </svg>
                    </a>
                  ) : (
                    <span className="leading-5 text-ink-secondary">
                      {source.name}
                      <span className="ml-1 text-ink-tertiary">({source.identifier})</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
