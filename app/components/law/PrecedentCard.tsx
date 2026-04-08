interface PrecedentCardProps {
  caseName: string;
  caseNumber: string;
  courtName: string;
  judgmentDate: string;
  summary: string;
}

// 판례 카드 (보라 좌측 보더, 세리프 사건명)
export function PrecedentCard({ caseName, caseNumber, courtName, judgmentDate, summary }: PrecedentCardProps) {
  return (
    <div className="my-2 border-l-[3px] border-cite-precedent bg-cite-precedent-bg p-4">
      <div className="mb-1 flex items-center gap-2 text-[11px] tracking-widest text-cite-precedent">
        <span className="font-semibold uppercase">{courtName}</span>
        <span className="inline-block w-1 h-1 rounded-full bg-accent-gold" />
        <span>{judgmentDate}</span>
      </div>
      <div className="mb-1 font-display text-sm font-semibold tracking-tight text-ink-primary">{caseName}</div>
      <div className="mb-2 font-mono text-[11px] text-ink-tertiary">{caseNumber}</div>
      <p className="text-sm leading-relaxed text-ink-secondary">{summary}</p>
    </div>
  );
}
