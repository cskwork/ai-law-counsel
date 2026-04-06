'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { MessageList, type ChatEvent } from './MessageList';
import type { SSEEvent } from '@/lib/utils/sse';
import type { Message } from '@/app/types/conversation';

const WELCOME_EVENT: ChatEvent = {
  id: 'welcome',
  type: 'message',
  role: 'system',
  content: '법률 관련 질문을 자유롭게 입력해주세요. 법령, 판례, 행정규칙을 검색하여 답변드립니다.',
};

const SUGGESTED_QUESTIONS = [
  '전세 보증금을 돌려받지 못하면 어떻게 해야 하나요?',
  '교통사고 합의금 적정 금액은 어떻게 산정하나요?',
  '직장에서 부당해고를 당했을 때 대처 방법은?',
  '온라인 쇼핑 환불 거부 시 소비자 권리는?',
  '이혼 시 재산분할 기준은 어떻게 되나요?',
  '층간소음 분쟁 해결 방법과 관련 법률은?',
];

interface ChatContainerProps {
  initialEvents?: ChatEvent[];
  initialMessages?: Message[];
  onSave?: (messages: Message[], events: ChatEvent[]) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

// 채팅 컨테이너: SSE 스트림을 파싱하여 메시지/도구호출 이벤트를 관리
export function ChatContainer({ initialEvents, initialMessages, onSave, onStreamingChange }: ChatContainerProps) {
  const eventIdRef = useRef(0);
  function nextId(): string {
    return `evt-${++eventIdRef.current}`;
  }

  const [events, setEvents] = useState<ChatEvent[]>(
    initialEvents ?? [WELCOME_EVENT]
  );
  const [conversationHistory, setConversationHistory] = useState<Message[]>(
    initialMessages ?? []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const prevStreamingRef = useRef(false);

  const handleSend = useCallback(async (userMessage: string) => {
    const userEvent: ChatEvent = {
      id: nextId(),
      type: 'message',
      role: 'user',
      content: userMessage,
    };
    setEvents((prev) => [...prev, userEvent]);

    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
    setConversationHistory(updatedHistory);
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? '서버 오류');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('스트림을 읽을 수 없습니다');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);

          try {
            const event = JSON.parse(data) as SSEEvent;

            switch (event.type) {
              case 'tool_call':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'tool_call',
                    toolName: event.name,
                    toolStatus: 'calling',
                  },
                ]);
                break;

              case 'tool_result':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'tool_result',
                    toolName: event.name,
                    toolStatus: 'done',
                    toolSummary: event.summary,
                  },
                ]);
                break;

              case 'content':
                assistantContent += (event.content ?? '');
                setEvents((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.type === 'message' && last.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantContent },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: nextId(),
                      type: 'message',
                      role: 'assistant' as const,
                      content: assistantContent,
                    },
                  ];
                });
                break;

              case 'error':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'message',
                    role: 'system',
                    content: `오류: ${event.message ?? '알 수 없는 오류'}`,
                  },
                ]);
                break;

              case 'done':
                if (event.sources && event.sources.length > 0) {
                  setEvents((prev) => [
                    ...prev,
                    {
                      id: nextId(),
                      type: 'sources',
                      sources: event.sources,
                    },
                  ]);
                }
                break;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }

      if (assistantContent) {
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: assistantContent },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '연결 오류';
      setEvents((prev) => [
        ...prev,
        { id: nextId(), type: 'message', role: 'system', content: `오류: ${message}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory]);

  // 스트리밍 상태 변경 알림
  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  // 스트리밍 완료 시 자동 저장
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && onSave) {
      onSave(conversationHistory, events);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, conversationHistory, events, onSave]);

  // 대화가 시작되지 않았는지 (추천 질문 표시용)
  const hasMessages = conversationHistory.length > 0;

  return (
    <div className="flex h-full flex-col bg-zinc-50">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <p className="mb-6 text-sm text-zinc-500">
            자주 묻는 법률 질문을 선택하거나, 직접 질문을 입력하세요.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 max-w-2xl lg:max-w-4xl xl:max-w-5xl w-full">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                onClick={() => handleSend(question)}
                disabled={isStreaming}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <MessageList events={events} isStreaming={isStreaming} />
      )}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
