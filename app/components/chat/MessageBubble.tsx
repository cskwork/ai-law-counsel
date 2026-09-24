import ReactMarkdown, { type Components, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from './CopyButton';
import { CitationCard } from './CitationCard';
import { DocumentDownload } from './DocumentDownload';
import { sanitizeContent } from '@/lib/utils/sanitize-content';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 사용자 질문의 접수 번호 (대화 내 순서) */
  ticketNo?: number;
}

/** cite: 프로토콜을 허용하는 URL 변환기 (기본값은 http/https/mailto/tel만 허용) */
function citeAwareUrlTransform(url: string): string {
  if (url.startsWith('cite:')) return url;
  return defaultUrlTransform(url);
}

// 법률 콘텐츠 가독성 최적화 커스텀 렌더러
const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 border-b border-rule pb-2 font-sign text-[1.05rem] font-extrabold tracking-[-0.01em] text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 flex items-center gap-2 font-sign text-[0.95rem] font-bold text-ink">
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-sign" />
      <span>{children}</span>
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-[4px] border border-rule bg-paper-2 px-4 py-2.5 text-[0.93rem] not-italic text-ink-2 [&>p]:my-1">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-[4px] border border-rule scrollbar-thin">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-rule-strong bg-paper-2">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left font-sign text-xs font-bold text-ink">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="tabular border-t border-rule px-3 py-2.5 align-top text-ink-2">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-paper-2/70">{children}</tr>
  ),
  hr: () => <hr className="my-6 border-rule" />,
  a: ({ href, children }) => {
    // cite: 프로토콜 감지 시 CitationCard 렌더링
    if (href && href.startsWith('cite:')) {
      return <CitationCard citeUrl={href}>{children}</CitationCard>;
    }
    // 일반 링크
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-way-law underline decoration-way-law/40 underline-offset-[3px] hover:decoration-way-law">
        {children}
      </a>
    );
  },
};

// 메시지: 사용자 질문은 번호표, AI 답변은 발급 문서, 시스템 안내는 게시 문구
export function MessageBubble({ role, content, ticketNo }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    const isError = content.startsWith('오류');
    return (
      <div className="flex justify-center py-2 animate-settle">
        <p
          role={isError ? 'alert' : undefined}
          className={`max-w-[40rem] rounded-[4px] px-3 py-1.5 text-center text-xs leading-relaxed ${
            isError ? 'border border-error/40 bg-error-tint text-error' : 'text-ink-3'
          }`}
        >
          {content}
        </p>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end pt-3 animate-feed">
        <div className="w-fit max-w-[88%] drop-shadow-[0_4px_10px_rgb(var(--ink)/0.12)] sm:max-w-[70%]">
          <div className="ticket-edge bg-paper px-4 pb-3.5 pt-4">
            <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-dashed border-rule pb-1.5">
              <span className="font-led text-xs tracking-[0.08em] text-sign">
                접수 {String(ticketNo ?? 0).padStart(3, '0')}
              </span>
              <CopyButton content={content} />
            </div>
            <p className="whitespace-pre-wrap break-words text-[1rem] leading-relaxed text-ink">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // 법률 문서 생성 감지 (AI 초안 면책 문구 포함 시)
  const isDocumentGeneration = content.includes('AI가 생성한 참고용 초안');

  // assistant 응답: 발급 문서
  return (
    <article className="rounded-[4px] bg-paper shadow-paper animate-settle" aria-label="답변">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-1.5 sm:px-6">
        <span className="flex items-center gap-2 font-sign text-xs font-bold text-sign">
          <span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-sign" />
          답변
        </span>
        <CopyButton content={content} />
      </div>
      <div className="px-4 pb-5 pt-4 sm:px-6">
        <div className="
          prose prose-base max-w-none break-words
          prose-headings:text-ink
          prose-p:my-2.5 prose-p:leading-[1.8] prose-p:text-ink-2
          prose-li:my-0.5 prose-li:leading-[1.8] prose-li:text-ink-2 prose-li:marker:text-ink-3
          prose-ol:my-2.5 prose-ul:my-2.5
          prose-strong:font-bold prose-strong:text-ink
          prose-code:rounded-chip prose-code:bg-paper-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal prose-code:text-ink prose-code:before:content-none prose-code:after:content-none
          prose-pre:my-3 prose-pre:rounded-[4px] prose-pre:bg-ink prose-pre:text-paper
        ">
          <ReactMarkdown urlTransform={citeAwareUrlTransform} remarkPlugins={[remarkGfm]} components={markdownComponents}>{sanitizeContent(content)}</ReactMarkdown>
        </div>
        {isDocumentGeneration && (
          <DocumentDownload content={content} />
        )}
      </div>
    </article>
  );
}
