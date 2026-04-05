interface PrecedentCardProps {
  caseName: string;
  caseNumber: string;
  courtName: string;
  judgmentDate: string;
  summary: string;
}

// 판례 카드 컴포넌트
export function PrecedentCard({ caseName, caseNumber, courtName, judgmentDate, summary }: PrecedentCardProps) {
  return (
    <div className="my-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-purple-600">
        <span>{courtName}</span>
        <span>{judgmentDate}</span>
      </div>
      <div className="mb-2 text-sm font-semibold text-gray-900">{caseName}</div>
      <div className="mb-1 text-xs text-gray-500">{caseNumber}</div>
      <p className="text-sm text-gray-700">{summary}</p>
    </div>
  );
}
