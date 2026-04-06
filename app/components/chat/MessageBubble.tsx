import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from './CopyButton';
import { sanitizeContent } from '@/lib/utils/sanitize-content';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 법률 콘텐츠 가독성 최적화 커스텀 렌더러
const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 pb-2 border-b border-zinc-200 text-base font-semibold tracking-tight text-zinc-900">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 pl-3 border-l-2 border-blue-400 text-sm font-semibold text-zinc-800">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg border-l-4 border-blue-400 bg-blue-50/60 px-4 py-2 text-sm text-zinc-700 not-italic [&>p]:my-1">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg ring-1 ring-zinc-200 scrollbar-thin">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-600 tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-zinc-700 border-t border-zinc-100">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-zinc-50/80">{children}</tr>
  ),
  hr: () => <hr className="my-5 border-zinc-200" />,
};

// 메시지 말풍선 (법률 콘텐츠 가독성 최적화)
export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3 animate-fade-up">
        <div className="bg-zinc-100 text-zinc-500 text-xs px-4 py-1.5 rounded-full tracking-wide">
          {content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="group flex justify-end my-1.5 animate-fade-up">
        <div className="flex items-start gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-2">
            <CopyButton content={content} />
          </div>
          <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] rounded-2xl bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-white">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // assistant 응답: 법률 콘텐츠 가독성 최적화
  return (
    <div className="group flex justify-start my-1.5 animate-fade-up">
      <div className="max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl bg-white px-5 py-4 text-sm shadow-sm shadow-zinc-200/50 ring-1 ring-zinc-100 relative">
        <div className="
          prose prose-sm prose-zinc max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-zinc-900
          prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2
          prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5
          prose-p:leading-[1.75] prose-p:text-zinc-700 prose-p:my-2
          prose-li:text-zinc-700 prose-li:leading-[1.75] prose-li:my-0.5
          prose-ol:my-2 prose-ul:my-2
          prose-strong:text-zinc-900 prose-strong:font-semibold
          prose-blockquote:border-l-blue-400 prose-blockquote:bg-blue-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-zinc-700 prose-blockquote:my-3
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-code:font-mono prose-code:text-[13px] prose-code:bg-zinc-100 prose-code:text-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-950 prose-pre:text-zinc-100 prose-pre:rounded-xl prose-pre:my-3
          prose-table:my-3
          prose-th:bg-zinc-50 prose-th:text-zinc-900 prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:px-3 prose-th:py-2
          prose-td:px-3 prose-td:py-2 prose-td:text-zinc-700 prose-td:border-zinc-200
          prose-hr:my-4 prose-hr:border-zinc-200
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{sanitizeContent(content)}</ReactMarkdown>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton content={content} />
        </div>
      </div>
    </div>
  );
}
