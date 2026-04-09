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

// 메시지 목록 (스마트 자동 스크롤 + 타이핑 커서)
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

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6"
    >
      <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4">
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
          <div className="my-3 animate-settle">
            <div className="border-l-[3px] border-authority-light pl-5 py-2">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-5 bg-accent-gold animate-cursor rounded-full" />
                <span className="text-xs text-ink-tertiary">답변 작성 중...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
