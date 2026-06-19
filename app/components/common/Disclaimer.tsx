// 법률 면책 조항 배너
export function Disclaimer() {
  return (
    <div
      role="note"
      aria-label="법률 면책 고지"
      className="border-b border-authority-deep bg-authority-deep px-4 py-2.5 text-center text-xs text-ink-inverse tracking-wide"
    >
      <span className="font-display font-semibold text-accent-gold">안내</span>
      <span className="mx-2 inline-block w-px h-3 bg-accent-gold/40 align-middle" />
      본 서비스는 AI 기반 법률 정보 제공이며, 정식 법률 자문이 아닙니다. 문서 분석 결과는 참고용이며, 법적 효력이 없습니다.
    </div>
  );
}
