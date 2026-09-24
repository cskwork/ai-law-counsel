import { toolLabel, toolWayLine, type WayLine } from '@/lib/chat/tool-labels';
import { LoadingDots } from '@/app/components/common/LoadingDots';

interface ToolCallIndicatorProps {
  toolName: string;
  status: 'calling' | 'done';
  summary?: string;
}

const WAY_DOT: Record<WayLine, string> = {
  law: 'bg-way-law',
  precedent: 'bg-way-precedent',
  admin: 'bg-way-admin',
  neutral: 'bg-ink-3',
};

// 창구 처리 기록: 어떤 창구(도구)가 질문을 받아 처리 중/완료했는지 표시
export function ToolCallIndicator({ toolName, status, summary }: ToolCallIndicatorProps) {
  const label = toolLabel(toolName);
  const way = toolWayLine(toolName);
  const done = status === 'done';

  return (
    <div className="flex items-center gap-2.5 py-1 pl-1 text-[0.8rem] animate-settle">
      <span aria-hidden="true" className={`h-1.5 w-5 shrink-0 rounded-full ${WAY_DOT[way]} ${done ? '' : 'opacity-60'}`} />
      <span className={`font-sign font-bold ${done ? 'text-ink' : 'text-ink-2'}`}>{label}</span>
      {done ? (
        <span className="stamp animate-stamp inline-block px-1.5 py-px font-sign text-[0.68rem] font-extrabold leading-tight text-ok">
          완료
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-ink-3">
          처리 중
          <LoadingDots />
        </span>
      )}
      {done && summary && (
        <span className="min-w-0 truncate text-ink-3">{summary}</span>
      )}
    </div>
  );
}
