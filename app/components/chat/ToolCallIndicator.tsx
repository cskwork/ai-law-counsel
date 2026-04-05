import { LoadingDots } from '@/app/components/common/LoadingDots';

const TOOL_LABELS: Record<string, string> = {
  search_law: '법령 검색',
  get_law_detail: '법령 조문 조회',
  search_precedent: '판례 검색',
  get_precedent_detail: '판례 상세 조회',
  search_administrative_rule: '행정규칙 검색',
  clarify_situation: '추가 질문 준비',
};

interface ToolCallIndicatorProps {
  toolName: string;
  status: 'calling' | 'done';
  summary?: string;
}

// 도구 호출 상태 표시 (호출 중 shimmer + 완료 시 체크)
export function ToolCallIndicator({ toolName, status, summary }: ToolCallIndicatorProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 my-1 ml-4 animate-fade-up">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${
        status === 'calling'
          ? 'bg-blue-50 text-blue-500'
          : 'bg-emerald-50 text-emerald-600'
      }`}>
        {status === 'calling' ? (
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse-soft" />
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>
      <span className="text-xs text-zinc-500 tracking-wide">{label}</span>
      {status === 'calling' && <LoadingDots />}
      {status === 'done' && summary && (
        <span className="text-xs text-zinc-400">{summary}</span>
      )}
    </div>
  );
}
