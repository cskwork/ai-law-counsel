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

// 도구 호출 상태 표시 (마진 노트 스타일)
export function ToolCallIndicator({ toolName, status, summary }: ToolCallIndicatorProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 my-1 ml-4 animate-settle">
      {status === 'calling' ? (
        <span className="h-2 w-2 rounded-full bg-accent-gold animate-breathe" />
      ) : (
        <svg className="h-3.5 w-3.5 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      <span className={`text-xs tracking-wide ${status === 'calling' ? 'text-ink-tertiary' : 'text-ink-secondary'}`}>
        {label}
      </span>
      {status === 'calling' && <LoadingDots />}
      {status === 'done' && summary && (
        <span className="text-xs text-ink-tertiary">{summary}</span>
      )}
    </div>
  );
}
