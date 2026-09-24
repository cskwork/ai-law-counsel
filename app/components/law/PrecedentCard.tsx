interface PrecedentCardProps {
  caseName: string;
  caseNumber: string;
  courtName: string;
  judgmentDate: string;
  summary: string;
}

// 판례 카드 (판례 안내선 초록)
export function PrecedentCard({ caseName, caseNumber, courtName, judgmentDate, summary }: PrecedentCardProps) {
  return (
    <div className="my-2 rounded-[4px] border border-rule bg-paper p-4 shadow-paper">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-way-precedent">
        <span aria-hidden="true" className="h-1.5 w-5 rounded-full bg-way-precedent" />
        <span>{courtName}</span>
        <span className="tabular text-ink-3">{judgmentDate}</span>
      </div>
      <div className="mb-1 font-sign text-sm font-bold text-ink">{caseName}</div>
      <div className="tabular mb-2 text-xs text-ink-3">{caseNumber}</div>
      <p className="text-sm leading-relaxed text-ink-2">{summary}</p>
    </div>
  );
}
