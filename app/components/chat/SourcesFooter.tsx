import type { SourceItem } from '@/lib/utils/sse';

const TYPE_CONFIG: Record<SourceItem['type'], { label: string; bgClass: string; textClass: string }> = {
  law: { label: '법령', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
  precedent: { label: '판례', bgClass: 'bg-violet-50', textClass: 'text-violet-600' },
  admin_rule: { label: '행정규칙', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
};

interface SourcesFooterProps {
  sources: SourceItem[];
}

// 참조 출처 표시 (기본 펼쳐진 아코디언)
export function SourcesFooter({ sources }: SourcesFooterProps) {
  if (sources.length === 0) return null;

  return (
    <div className="flex justify-start my-1.5 animate-fade-up">
      <div className="max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl bg-white px-5 py-3 text-sm shadow-sm shadow-zinc-200/50 ring-1 ring-zinc-100">
        <details open>
          <summary className="cursor-pointer select-none text-xs font-medium text-zinc-500 tracking-wide hover:text-zinc-700 transition-colors">
            참조 출처 ({sources.length}건)
          </summary>
          <ul className="mt-2 space-y-1.5">
            {sources.map((source) => {
              const config = TYPE_CONFIG[source.type];
              return (
                <li key={`${source.type}:${source.identifier}`} className="flex items-start gap-2 text-xs">
                  <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${config.bgClass} ${config.textClass}`}>
                    {config.label}
                  </span>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leading-5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {source.name}
                    </a>
                  ) : (
                    <span className="leading-5 text-zinc-600">
                      {source.name}
                      <span className="ml-1 text-zinc-400">({source.identifier})</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </div>
  );
}
