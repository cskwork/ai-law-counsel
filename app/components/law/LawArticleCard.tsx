interface LawArticleCardProps {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

// 법령 조문 카드 컴포넌트
export function LawArticleCard({ lawName, articleNumber, articleTitle, articleContent }: LawArticleCardProps) {
  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-1 text-xs font-medium text-blue-600">{lawName}</div>
      <div className="mb-2 text-sm font-semibold text-gray-900">
        {articleNumber} {articleTitle}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{articleContent}</p>
    </div>
  );
}
