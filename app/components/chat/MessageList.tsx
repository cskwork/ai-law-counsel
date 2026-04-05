'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolCallIndicator } from './ToolCallIndicator';
import { LoadingDots } from '@/app/components/common/LoadingDots';

// 채팅 이벤트 타입 (메시지, 도구 호출, 도구 결과)
export interface ChatEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  toolName?: string;
  toolStatus?: 'calling' | 'done';
  toolSummary?: string;
}

interface MessageListProps {
  events: ChatEvent[];
  isStreaming: boolean;
}

// 채팅 메시지 목록 컴포넌트 (자동 스크롤 포함)
export function MessageList({ events, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-1">
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
          return null;
        })}
        {isStreaming && events[events.length - 1]?.type !== 'tool_call' && (
          <div className="flex justify-start my-2">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
