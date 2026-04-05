interface LawArticleCardProps {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

// 법령 조문 카드 (blue accent, 1px whisper border)
export function LawArticleCard({ lawName, articleNumber, articleTitle, articleContent }: LawArticleCardProps) {
  return (
    <div className="my-2 rounded-xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-blue-500">{lawName}</div>
      <div className="mb-2 text-sm font-semibold tracking-tight text-zinc-900">
        {articleNumber} {articleTitle}
      </div>
      <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">{articleContent}</p>
    </div>
  );
}
