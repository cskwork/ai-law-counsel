'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { MessageList, type ChatEvent } from './MessageList';
import { FileUpload, type UploadResult } from './FileUpload';
import { EmergencyContacts } from '@/app/components/common/EmergencyContacts';
import type { SSEEvent } from '@/lib/utils/sse';
import type { Message } from '@/app/types/conversation';
import type { DocumentContext } from '@/lib/document/context';
import { buildContextWindow } from '@/lib/chat/context-window';

const WELCOME_EVENT: ChatEvent = {
  id: 'welcome',
  type: 'message',
  role: 'system',
  content: '법률 관련 질문을 자유롭게 입력해주세요. 법령, 판례, 행정규칙을 검색하여 답변드립니다.',
};

/** 추천 질문 카테고리 그룹 (질문 텍스트는 유지, 소제목만 추가) */
interface SuggestedGroup {
  readonly title: string;
  readonly questions: readonly string[];
}

const SUGGESTED_GROUPS: readonly SuggestedGroup[] = [
  {
    title: '법률 상담',
    questions: [
      '전세 보증금을 돌려받지 못하면 어떻게 해야 하나요?',
      '교통사고 합의금 적정 금액은 어떻게 산정하나요?',
      '직장에서 부당해고를 당했을 때 대처 방법은?',
      '온라인 쇼핑 환불 거부 시 소비자 권리는?',
      '층간소음 분쟁 해결 방법과 관련 법률은?',
    ],
  },
  {
    title: '문서 작성',
    questions: [
      '임대차 계약서 작성해줘',
      '근로계약서 만들어줘',
      '내용증명 작성을 도와주세요',
    ],
  },
];

/** 재시도용 마지막 전송 시도 (오류 발생 시 보관) */
interface LastAttempt {
  readonly userMessage: string;
  readonly document: DocumentContext | null;
}

/** 연속 재시도 상한 (반복 실패 요청의 무제한 재전송 방지) */
const MAX_RETRIES = 3;

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
  const [pendingDocument, setPendingDocument] = useState<DocumentContext | null>(null);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const prevStreamingRef = useRef(false);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    const docContext: DocumentContext = {
      fileName: result.fileName,
      fileType: result.fileType as 'pdf' | 'docx' | 'txt',
      fileSize: result.fileSize,
      extractedText: result.extractedText,
      extractedTextLength: result.extractedTextLength,
    };
    setPendingDocument(docContext);

    // 긴 문서가 잘린 경우 안내 (originalTextLength → extractedTextLength)
    const truncationNotice = result.truncated
      ? ` 문서가 길어 앞부분 약 ${result.extractedTextLength.toLocaleString()}자만 분석합니다` +
        (typeof result.originalTextLength === 'number'
          ? ` (전체 ${result.originalTextLength.toLocaleString()}자).`
          : '.')
      : '';

    // 업로드 성공 알림 이벤트
    setEvents((prev) => [
      ...prev,
      {
        id: nextId(),
        type: 'message',
        role: 'system',
        content: `"${result.fileName}" 업로드 완료 (${result.extractedTextLength.toLocaleString()}자 추출). 분석할 내용을 입력하세요.${truncationNotice}`,
      },
    ]);
  }, []);

  const handleSend = useCallback(async (userMessage: string, retryDocument?: DocumentContext | null) => {
    // 재시도 시에는 보관된 문서를, 아니면 현재 첨부 문서를 사용
    const isRetry = retryDocument !== undefined;
    const currentDoc = isRetry ? retryDocument : pendingDocument;
    // 새 전송(재시도 아님)은 재시도 카운터 초기화
    if (!isRetry) setRetryCount(0);

    // 문서 첨부 표시
    const displayContent = currentDoc
      ? `[${currentDoc.fileName}] ${userMessage}`
      : userMessage;

    const userEvent: ChatEvent = {
      id: nextId(),
      type: 'message',
      role: 'user',
      content: displayContent,
    };
    setEvents((prev) => [...prev, userEvent]);

    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
    setConversationHistory(updatedHistory);
    setIsStreaming(true);
    // 스트리밍 시작 시 이전 재시도 상태 숨김
    setLastAttempt(null);

    // documentContext를 요청에 포함하고 초기화
    setPendingDocument(null);

    let assistantContent = '';

    try {
      const requestBody: Record<string, unknown> = {
        messages: buildContextWindow(updatedHistory),
      };
      if (currentDoc) {
        requestBody.documentContext = currentDoc;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
                // 스트림 오류 시 재시도용으로 마지막 입력 보관
                setLastAttempt({ userMessage, document: currentDoc });
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
      // fetch/스트림 실패 시 재시도용으로 마지막 입력 보관
      setLastAttempt({ userMessage, document: currentDoc });
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory, pendingDocument]);

  const handleRetry = useCallback(() => {
    if (!lastAttempt || isStreaming || retryCount >= MAX_RETRIES) return;
    // 보관된 동일 입력으로 재전송 (handleSend 재사용)
    setRetryCount((c) => c + 1);
    handleSend(lastAttempt.userMessage, lastAttempt.document);
  }, [lastAttempt, isStreaming, retryCount, handleSend]);

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
    <div className="flex h-full flex-col bg-surface-ground">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* 천칭 아이콘 */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-accent-gold mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
          </svg>
          <h2 className="font-display text-xl font-semibold text-ink-primary mb-2">법률 상담</h2>
          <p className="mb-8 text-sm text-ink-secondary">
            자주 묻는 법률 질문을 선택하거나, 직접 질문을 입력하세요.
          </p>
          <div className="w-full max-w-lg">
            {SUGGESTED_GROUPS.map((group) => (
              <div key={group.title} className="mb-4">
                <h3 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
                  {group.title}
                </h3>
                {group.questions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSend(question)}
                    disabled={isStreaming}
                    className="group flex w-full items-center gap-3 border-b border-border-subtle px-3 py-3 text-left text-sm text-ink-secondary transition-colors hover:text-ink-primary hover:bg-surface-elevated disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-accent-gold opacity-0 group-hover:opacity-100 transition-opacity">
                      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                    <span>{question}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-6 w-full max-w-lg">
            <EmergencyContacts />
          </div>
        </div>
      ) : (
        <MessageList events={events} isStreaming={isStreaming} />
      )}
      {lastAttempt && !isStreaming && (
        <div className="border-t border-border-default bg-surface-primary px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-center justify-center lg:max-w-5xl xl:max-w-6xl">
            {retryCount < MAX_RETRIES ? (
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-sunken px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:border-border-strong hover:bg-surface-elevated hover:text-ink-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5a.75.75 0 0 1 .288 1.022 6 6 0 0 1-9.44 1.241l-.84-.84v1.37a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75h3.181a.75.75 0 0 1 0 1.5h-1.37l.841.84a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.01-.289Z" clipRule="evenodd" />
                </svg>
                다시 시도
              </button>
            ) : (
              <span className="text-xs text-ink-tertiary">
                재시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.
              </span>
            )}
          </div>
        </div>
      )}
      <div className="border-t border-border-default bg-surface-primary px-4 pt-2">
        <FileUpload onUploadComplete={handleUploadComplete} disabled={isStreaming} />
        {pendingDocument && (
          <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent-gold-light px-3 py-1.5 text-xs text-accent-gold-dim">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
              <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 5H10V3.5A1.5 1.5 0 008.5 2h-5z" />
            </svg>
            <span className="truncate font-medium">{pendingDocument.fileName}</span>
            <span className="text-accent-gold">({pendingDocument.extractedTextLength.toLocaleString()}자)</span>
            <button
              onClick={() => setPendingDocument(null)}
              className="ml-auto text-accent-gold hover:text-accent-gold-dim"
              title="문서 제거"
            >
              x
            </button>
          </div>
        )}
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
