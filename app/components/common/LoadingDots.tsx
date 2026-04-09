// 스켈레톤 로딩 인디케이터 (골드 breathe 애니메이션)
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-gold animate-breathe" />
      <span className="h-1.5 w-1.5 rounded-full bg-accent-gold animate-breathe [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-accent-gold animate-breathe [animation-delay:0.4s]" />
    </span>
  );
}
