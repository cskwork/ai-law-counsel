// LED 점 로딩 인디케이터
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-led animate-led" />
      <span className="h-1.5 w-1.5 rounded-full bg-led animate-led [animation-delay:0.33s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-led animate-led [animation-delay:0.66s]" />
    </span>
  );
}
