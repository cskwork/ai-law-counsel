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

// 메시지 목록 (스마트 자동 스크롤 + 스켈레톤 로더)
export function MessageList({ events, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (shouldAutoScrollRef.current && el) {
      isProgrammaticScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
      isProgrammaticScrollRef.current = false;
    }
  }, [events, isStreaming]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6"
    >
      <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-0.5">
        {events.map((event) => {
          if (event.type === 'message' && event.role && event.content) {
            return (
              <MessageBubble
                key={event.id}
                role={event.role}
                content={event.content}
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
        {isStreaming && events[events.length - 1]?.type !== 'tool_call' && (
          <div className="flex justify-start my-1.5 animate-fade-up">
            <div className="max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl bg-white px-5 py-4 shadow-sm shadow-zinc-200/50 ring-1 ring-zinc-100">
              <div className="flex flex-col gap-2.5">
                <div className="h-3 w-56 rounded-md animate-shimmer" />
                <div className="h-3 w-72 rounded-md animate-shimmer [animation-delay:0.05s]" />
                <div className="h-3 w-44 rounded-md animate-shimmer [animation-delay:0.1s]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
