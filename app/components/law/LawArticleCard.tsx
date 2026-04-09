interface LawArticleCardProps {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

// 법령 조문 카드 (남색 좌측 보더, 세리프 제목)
export function LawArticleCard({ lawName, articleNumber, articleTitle, articleContent }: LawArticleCardProps) {
  return (
    <div className="my-2 border-l-[3px] border-cite-law bg-cite-law-bg p-4">
      <div className="mb-1 font-display text-[11px] font-semibold uppercase tracking-widest text-cite-law">{lawName}</div>
      <div className="mb-2 text-sm font-semibold tracking-tight text-ink-primary">
        <span className="font-mono text-ink-secondary">{articleNumber}</span> {articleTitle}
      </div>
      <p className="text-sm leading-relaxed text-ink-secondary whitespace-pre-wrap">{articleContent}</p>
    </div>
  );
}
