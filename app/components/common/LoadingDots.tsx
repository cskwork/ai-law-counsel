// 스켈레톤 로딩 인디케이터
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-pulse-soft" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-pulse-soft [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-pulse-soft [animation-delay:0.4s]" />
    </span>
  );
}
