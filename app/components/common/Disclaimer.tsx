// 법률 면책 조항 배너 (게시된 안내문)
export function Disclaimer() {
  return (
    <div
      role="note"
      aria-label="법률 면책 고지"
      className="shrink-0 border-b border-rule bg-paper px-4 py-2 text-ink-2"
    >
      <p className="mx-auto flex max-w-6xl items-start gap-2.5 text-xs leading-relaxed sm:items-center">
        <span className="mt-px shrink-0 rounded-chip bg-way-admin px-1.5 py-0.5 font-sign text-[11px] font-extrabold leading-none text-[#1d1500]">
          안내
        </span>
        <span>
          본 서비스는 AI 기반 법률 정보 제공이며, 정식 법률 자문이 아닙니다. 문서 분석 결과는 참고용이며, 법적 효력이 없습니다.
        </span>
      </p>
    </div>
  );
}
