import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 메시지 말풍선 (역할별 스타일 분기 + fade-up 애니메이션)
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} my-1.5 animate-fade-up`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-900 text-white'
            : 'bg-white text-zinc-800 shadow-sm shadow-zinc-200/50 ring-1 ring-zinc-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-zinc prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:font-mono prose-code:text-[13px] prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-zinc-950 prose-pre:text-zinc-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
