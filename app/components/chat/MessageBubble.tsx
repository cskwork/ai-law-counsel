import ReactMarkdown, { type Components, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from './CopyButton';
import { CitationCard } from './CitationCard';
import { DocumentDownload } from './DocumentDownload';
import { sanitizeContent } from '@/lib/utils/sanitize-content';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** cite: 프로토콜을 허용하는 URL 변환기 (기본값은 http/https/mailto/tel만 허용) */
function citeAwareUrlTransform(url: string): string {
  if (url.startsWith('cite:')) return url;
  return defaultUrlTransform(url);
}

// 법률 콘텐츠 가독성 최적화 커스텀 렌더러
const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 pb-2 border-b border-border-default font-display text-base font-semibold tracking-tight text-ink-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 pl-3 border-l-2 border-accent-gold font-display text-sm font-semibold text-ink-primary">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg border-l-4 border-accent-gold bg-accent-gold-light px-4 py-2 text-sm text-ink-secondary not-italic [&>p]:my-1">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg ring-1 ring-border-default scrollbar-thin">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="sticky top-0 bg-surface-elevated border-b border-border-default">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-secondary tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-ink-secondary border-t border-border-subtle">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-surface-elevated/60">{children}</tr>
  ),
  hr: () => <hr className="my-5 border-border-default" />,
  a: ({ href, children }) => {
    // cite: 프로토콜 감지 시 CitationCard 렌더링
    if (href && href.startsWith('cite:')) {
      return <CitationCard citeUrl={href}>{children}</CitationCard>;
    }
    // 일반 링크
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-authority-mid hover:underline">
        {children}
      </a>
    );
  },
};

// 메시지 말풍선 (법률 콘텐츠 가독성 최적화)
export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-settle">
        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="flex-1 border-t border-border-subtle" />
          <p className="text-xs italic text-ink-tertiary px-2">{content}</p>
          <div className="flex-1 border-t border-border-subtle" />
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="group flex justify-end my-2 animate-settle">
        <div className="flex items-start gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-2">
            <CopyButton content={content} />
          </div>
          <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] rounded-t-xl rounded-bl-xl rounded-br-sm bg-authority-deep px-4 py-3 text-base leading-relaxed text-ink-inverse">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // 법률 문서 생성 감지 (AI 초안 면책 문구 포함 시)
  const isDocumentGeneration = content.includes('AI가 생성한 참고용 초안');

  // assistant 응답: 법률 문서 블록 스타일
  return (
    <div className="group my-3 animate-settle">
      <div className="max-w-[92%] sm:max-w-[85%] lg:max-w-[80%] border-l-[3px] border-authority-light pl-5 pr-2 py-1 relative">
        <div className="
          prose prose-base max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-ink-primary
          prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:font-display
          prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-display
          prose-p:leading-[1.75] prose-p:text-ink-secondary prose-p:my-2
          prose-li:text-ink-secondary prose-li:leading-[1.75] prose-li:my-0.5
          prose-ol:my-2 prose-ul:my-2
          prose-strong:text-ink-primary prose-strong:font-semibold
          prose-blockquote:border-l-accent-gold prose-blockquote:bg-accent-gold-light prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-ink-secondary prose-blockquote:my-3
          prose-a:text-authority-mid prose-a:no-underline hover:prose-a:underline
          prose-code:font-mono prose-code:text-[13px] prose-code:bg-surface-sunken prose-code:text-ink-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-ink-primary prose-pre:text-ink-inverse prose-pre:rounded-lg prose-pre:my-3
          prose-table:my-3
          prose-th:bg-surface-elevated prose-th:text-ink-primary prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:px-3 prose-th:py-2
          prose-td:px-3 prose-td:py-2 prose-td:text-ink-secondary prose-td:border-border-default
          prose-hr:my-4 prose-hr:border-border-default
        ">
          <ReactMarkdown urlTransform={citeAwareUrlTransform} remarkPlugins={[remarkGfm]} components={markdownComponents}>{sanitizeContent(content)}</ReactMarkdown>
        </div>
        {isDocumentGeneration && (
          <DocumentDownload content={content} />
        )}
        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton content={content} />
        </div>
      </div>
    </div>
  );
}
