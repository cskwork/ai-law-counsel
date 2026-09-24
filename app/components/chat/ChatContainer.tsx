'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChatInput } from './ChatInput';
import { MessageList, type ChatEvent } from './MessageList';
import { FileUpload, type UploadResult } from './FileUpload';
import { EmergencyContacts } from '@/app/components/common/EmergencyContacts';
import type { SSEEvent } from '@/lib/utils/sse';
import type { Message } from '@/app/types/conversation';
import type { DocumentContext } from '@/lib/document/context';
import { buildContextWindow } from '@/lib/chat/context-window';
import { toolLabel } from '@/lib/chat/tool-labels';

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

/** 사용자가 답변 생성을 중단했을 때 남기는 안내 */
export const STOPPED_NOTICE = '답변 생성을 중단했습니다. 작성된 부분까지만 보관합니다.';

interface ChatContainerProps {
  initialEvents?: ChatEvent[];
  initialMessages?: Message[];
  onSave?: (messages: Message[], events: ChatEvent[]) => void;
  onStreamingChange?: (streaming: boolean) => void;
  /** 헤더 전광판에 표시할 현재 진행 상태 */
  onStatusChange?: (status: string) => void;
}

/** 이벤트 흐름에서 전광판 문구를 계산 (순수 함수) */
export function deriveBoardStatus(events: readonly ChatEvent[], isStreaming: boolean): string {
  const last = events[events.length - 1];
  if (!isStreaming) {
    if (last?.type === 'message' && last.role === 'system' && last.content?.startsWith('오류')) {
      return '처리 오류';
    }
    return '접수 대기';
  }
  if (last?.type === 'tool_call' && last.toolName) return `${toolLabel(last.toolName)} 중`;
  if (last?.type === 'tool_result') return '자료 검토 중';
  if (last?.type === 'message' && last.role === 'assistant') return '답변 작성 중';
  return '접수 확인 중';
}


// 채팅 컨테이너: SSE 스트림을 파싱하여 메시지/도구호출 이벤트를 관리
export function ChatContainer({
  initialEvents,
  initialMessages,
  onSave,
  onStreamingChange,
  onStatusChange,
}: ChatContainerProps) {
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
  // 진행 중인 요청 중단용 컨트롤러
  const abortRef = useRef<AbortController | null>(null);

  // 언마운트 시 진행 중 요청 정리
  useEffect(() => () => abortRef.current?.abort(), []);

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

    const controller = new AbortController();
    abortRef.current = controller;
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
        signal: controller.signal,
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
    } catch (error) {
      if (controller.signal.aborted) {
        // 사용자가 중단: 오류가 아니므로 재시도 대상에서 제외
        setEvents((prev) => [
          ...prev,
          { id: nextId(), type: 'message', role: 'system', content: STOPPED_NOTICE },
        ]);
      } else {
        const message = error instanceof Error ? error.message : '연결 오류';
        setEvents((prev) => [
          ...prev,
          { id: nextId(), type: 'message', role: 'system', content: `오류: ${message}` },
        ]);
        // fetch/스트림 실패 시 재시도용으로 마지막 입력 보관
        setLastAttempt({ userMessage, document: currentDoc });
      }
    } finally {
      // 완료·중단 모두: 받은 만큼의 답변은 대화 기록에 보관
      if (assistantContent) {
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: assistantContent },
        ]);
      }
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
    }
  }, [conversationHistory, pendingDocument]);

  // 답변 생성 중단
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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

  // 전광판 상태 알림
  const boardStatus = deriveBoardStatus(events, isStreaming);
  useEffect(() => {
    onStatusChange?.(boardStatus);
  }, [boardStatus, onStatusChange]);

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
    <div className="flex h-full flex-col">
      {!hasMessages ? (
        <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <EmptyState onPick={handleSend} disabled={isStreaming} />
        </div>
      ) : (
        <MessageList events={events} isStreaming={isStreaming} />
      )}
      {lastAttempt && !isStreaming && (
        <div className="shrink-0 border-t border-rule bg-error-tint/60 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
            {retryCount < MAX_RETRIES ? (
              <>
                <span className="text-xs text-ink-2">요청을 처리하지 못했습니다.</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 rounded-chip border border-rule-strong bg-paper px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink-3 hover:bg-paper-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5a.75.75 0 0 1 .288 1.022 6 6 0 0 1-9.44 1.241l-.84-.84v1.37a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75h3.181a.75.75 0 0 1 0 1.5h-1.37l.841.84a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.01-.289Z" clipRule="evenodd" />
                  </svg>
                  다시 시도
                </button>
              </>
            ) : (
              <span className="text-xs text-ink-2">
                재시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.
              </span>
            )}
          </div>
        </div>
      )}
      <div className="shrink-0 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-3 pt-2.5 sm:px-5">
          <FileUpload onUploadComplete={handleUploadComplete} disabled={isStreaming} />
          {pendingDocument && (
            <div className="mt-2 flex items-center gap-2 rounded-chip border border-way-law/40 bg-way-law-tint px-3 py-1.5 text-xs text-ink">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-3.5 w-3.5 shrink-0 text-way-law" aria-hidden="true">
                <path strokeLinejoin="round" d="M4 1.75h5.5L12.5 4.75v9.5h-8.5z M9.5 1.75v3h3" />
              </svg>
              <span className="truncate font-medium">{pendingDocument.fileName}</span>
              <span className="tabular shrink-0 text-ink-3">({pendingDocument.extractedTextLength.toLocaleString()}자)</span>
              <button
                type="button"
                onClick={() => setPendingDocument(null)}
                className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-chip text-ink-3 transition-colors hover:bg-paper hover:text-error"
                title="문서 제거"
                aria-label="첨부 문서 제거"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5" aria-hidden="true">
                  <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <ChatInput onSend={handleSend} onStop={handleStop} disabled={isStreaming} streaming={isStreaming} />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onPick: (question: string) => void;
  disabled: boolean;
}

/** 안내선 범례: 답변 근거의 세 갈래 */
const WAY_LEGEND = [
  { label: '법령', className: 'bg-way-law' },
  { label: '판례', className: 'bg-way-precedent' },
  { label: '행정규칙', className: 'bg-way-admin' },
] as const;

// 빈 상태: 창구 두 곳(법률 상담 / 문서 작성) + 긴급 연락처 + 민원실 그림
function EmptyState({ onPick, disabled }: EmptyStateProps) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-10 lg:pt-12">
      <section aria-labelledby="empty-title" className="min-w-0">
        <h2 id="empty-title" className="font-sign text-[2rem] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
          법률 상담
        </h2>
        <p className="mt-2 max-w-[40ch] text-[0.95rem] leading-relaxed text-ink-2">
          자주 묻는 법률 질문을 선택하거나, 직접 질문을 입력하세요.
        </p>

        <div className="mt-7 grid items-start gap-4 md:grid-cols-2">
          {SUGGESTED_GROUPS.map((group, index) => (
            <div key={group.title} className="overflow-hidden rounded-[4px] bg-paper shadow-paper">
              <div className="flex items-center gap-2.5 bg-sign px-3.5 py-2.5 text-sign-ink">
                <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-chip bg-sign-ink font-sign text-sm font-extrabold text-sign">
                  {index + 1}
                </span>
                <h3 className="font-sign text-[0.95rem] font-bold tracking-[-0.01em]">
                  {group.title}
                </h3>
              </div>
              <ul>
                {group.questions.map((question) => (
                  <li key={question} className="border-t border-rule first:border-t-0">
                    <button
                      type="button"
                      onClick={() => onPick(question)}
                      disabled={disabled}
                      className="group flex w-full items-center gap-3 px-3.5 py-3 text-left text-[0.93rem] leading-snug text-ink transition-colors hover:bg-paper-2 disabled:opacity-50"
                    >
                      <span className="min-w-0 flex-1">{question}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-sign" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.5 10.5 8 6 12.5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-2">
          <span className="font-medium text-ink">답변 근거는 색으로 구분됩니다</span>
          {WAY_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-1.5 w-7 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-4" aria-label="도움 받을 곳">
        <figure className="hidden overflow-hidden rounded-[4px] bg-paper shadow-paper lg:block">
          <Image
            src="/images/counter-hall-768.webp"
            unoptimized
            width={768}
            height={512}
            alt="비어 있는 민원실 창구 세 곳과 번호표 발급기, 창구로 이어지는 파랑·초록·노랑 바닥 안내선"
            className="block aspect-[3/2] w-full object-cover"
          />
        </figure>
        <EmergencyContacts />
      </aside>
    </div>
  );
}
