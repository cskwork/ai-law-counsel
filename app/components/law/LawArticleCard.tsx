interface LawArticleCardProps {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

// 법령 조문 카드 (법령 안내선 파랑)
export function LawArticleCard({ lawName, articleNumber, articleTitle, articleContent }: LawArticleCardProps) {
  return (
    <div className="my-2 rounded-[4px] border border-rule bg-paper p-4 shadow-paper">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-way-law">
        <span aria-hidden="true" className="h-1.5 w-5 rounded-full bg-way-law" />
        {lawName}
      </div>
      <div className="mb-2 font-sign text-sm font-bold text-ink">
        <span className="tabular text-ink-2">{articleNumber}</span> {articleTitle}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{articleContent}</p>
    </div>
  );
}
