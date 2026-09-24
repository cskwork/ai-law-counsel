// 헤더 LED 전광판: 현재 처리 중인 창구(도구)와 상태를 표시하고 스크린리더에 알림
interface StatusBoardProps {
  status: string;
  active: boolean;
  className?: string;
}

export function StatusBoard({ status, active, className = '' }: StatusBoardProps) {
  return (
    <div
      className={`led-board flex h-9 items-center gap-2.5 rounded-chip px-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`진행 상태: ${status}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full bg-led shadow-[0_0_6px_rgb(var(--led)/0.8)] ${active ? 'animate-led' : 'opacity-40'}`}
      />
      <span aria-hidden="true" className="led-text truncate text-[0.95rem] leading-none">
        {status}
      </span>
    </div>
  );
}
