'use client';

import { useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolCallIndicator } from './ToolCallIndicator';
import { SourcesFooter } from './SourcesFooter';
import type { SourceItem } from '@/lib/utils/sse';

export interface ChatEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result' | 'sources';
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  toolName?: string;
  toolStatus?: 'calling' | 'done';
  toolSummary?: string;
  sources?: SourceItem[];
}

interface MessageListProps {
  events: ChatEvent[];
  isStreaming: boolean;
}

const SCROLL_THRESHOLD = 100; // 하단에서 100px 이내면 auto-scroll 유지

// 메시지 목록 (스마트 자동 스크롤 + 접수 번호)
export function MessageList({ events, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (shouldAutoScrollRef.current && el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  // 사용자 질문마다 접수 번호 부여 (대화 내 순서)
  let ticketNo = 0;
  const last = events[events.length - 1];

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-6 sm:px-5"
    >
      <div className="mx-auto max-w-[48rem] space-y-3">
        {events.map((event) => {
          if (event.type === 'message' && event.role && event.content) {
            const ticket = event.role === 'user' ? ++ticketNo : undefined;
            return (
              <MessageBubble
                key={event.id}
                role={event.role}
                content={event.content}
                ticketNo={ticket}
              />
            );
          }
          if ((event.type === 'tool_call' || event.type === 'tool_result') && event.toolName) {
            return (
              <ToolCallIndicator
                key={event.id}
                toolName={event.toolName}
                status={event.toolStatus ?? 'calling'}
                summary={event.toolSummary}
              />
            );
          }
          if (event.type === 'sources' && event.sources && event.sources.length > 0) {
            return <SourcesFooter key={event.id} sources={event.sources} />;
          }
          return null;
        })}
        {isStreaming && last?.type !== 'tool_call' && !(last?.type === 'message' && last.role === 'assistant') && (
          <div className="flex items-center gap-2.5 py-1 pl-1 text-[0.8rem] text-ink-3 animate-settle">
            <span aria-hidden="true" className="h-4 w-0.5 rounded-full bg-led animate-caret" />
            답변 작성 중...
          </div>
        )}
      </div>
    </div>
  );
}
