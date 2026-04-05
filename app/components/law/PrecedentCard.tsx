interface PrecedentCardProps {
  caseName: string;
  caseNumber: string;
  courtName: string;
  judgmentDate: string;
  summary: string;
}

// 판례 카드 (purple accent, elevated)
export function PrecedentCard({ caseName, caseNumber, courtName, judgmentDate, summary }: PrecedentCardProps) {
  return (
    <div className="my-2 rounded-xl bg-violet-50/50 p-4 ring-1 ring-violet-100">
      <div className="mb-1 flex items-center gap-2 text-[11px] tracking-widest text-violet-500">
        <span className="font-medium uppercase">{courtName}</span>
        <span className="text-violet-300">|</span>
        <span>{judgmentDate}</span>
      </div>
      <div className="mb-1 text-sm font-semibold tracking-tight text-zinc-900">{caseName}</div>
      <div className="mb-2 font-mono text-[11px] text-zinc-400">{caseNumber}</div>
      <p className="text-sm leading-relaxed text-zinc-600">{summary}</p>
    </div>
  );
}
