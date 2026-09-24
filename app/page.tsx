'use client';

import { useState, useCallback, useEffect } from 'react';
import { Disclaimer } from '@/app/components/common/Disclaimer';
import { ChatContainer } from '@/app/components/chat/ChatContainer';
import { Sidebar } from '@/app/components/chat/Sidebar';
import { StatusBoard } from '@/app/components/common/StatusBoard';
import { useConversationHistory } from '@/app/hooks/useConversationHistory';
import { useFontSize } from '@/app/hooks/useFontSize';
import { useTheme } from '@/app/hooks/useTheme';

const IDLE_STATUS = '접수 대기';

export default function Home() {
  const {
    conversations,
    activeId,
    save,
    load,
    remove,
    removeAll,
    setActiveId,
  } = useConversationHistory();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [boardStatus, setBoardStatus] = useState(IDLE_STATUS);
  const { canIncrease, canDecrease, increase, decrease } = useFontSize();
  const { theme, toggle: toggleTheme } = useTheme();

  // 새 대화용 안정 ID (activeId가 null일 때 사용)
  const [pendingId, setPendingId] = useState('');

  // hydration 이후 UUID 생성
  useEffect(() => {
    if (!pendingId) {
      setPendingId(crypto.randomUUID());
    }
  }, [pendingId]);

  // 현재 대화 ID: 기존 대화 또는 새 대화의 pending ID
  const currentId = activeId ?? pendingId;

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    if (isStreaming) return; // 스트리밍 중 새 채팅 방지
    setActiveId(null);
    setPendingId(crypto.randomUUID());
    setSidebarOpen(false);
  }, [setActiveId, isStreaming]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isStreaming) return; // 스트리밍 중 대화 전환 방지
      setActiveId(id);
      setSidebarOpen(false);
    },
    [setActiveId, isStreaming]
  );

  const handleSave = useCallback(
    (messages: Parameters<typeof save>[1], events: Parameters<typeof save>[2]) => {
      const id = currentId;
      if (!activeId) {
        // 새 대화를 activeId로 승격 (key 변경 없음 -- currentId 동일)
        setActiveId(id);
      }
      save(id, messages, events);
    },
    [activeId, currentId, save, setActiveId]
  );

  // 활성 대화 로드
  const activeConversation = activeId ? load(activeId) : null;

  const controlClass =
    'grid h-9 min-w-9 place-items-center rounded-chip px-2 text-sign-ink-2 transition-colors hover:bg-sign-ink/10 hover:text-sign-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent';

  return (
    <div className="flex h-[100dvh] flex-col bg-ground">
      <Disclaimer />
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        disabled={isStreaming}
        onClose={handleCloseSidebar}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={remove}
        onDeleteAll={removeAll}
      />
      <header className="shrink-0 bg-sign text-sign-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-5">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className={controlClass}
            title="대화 목록"
            aria-label="대화 목록 열기/닫기"
            aria-expanded={sidebarOpen}
            aria-controls="conversation-drawer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h9" />
            </svg>
          </button>
          <h1 className="font-sign text-lg font-extrabold tracking-[-0.02em] sm:text-xl">
            법률 상담 AI
          </h1>
          <StatusBoard
            status={boardStatus}
            active={isStreaming}
            className="order-last w-full sm:order-none sm:ml-auto sm:w-auto sm:min-w-[15rem]"
          />
          <div className="ml-auto flex items-center gap-0.5 sm:ml-0" role="group" aria-label="보기 설정">
            <button
              type="button"
              onClick={decrease}
              disabled={!canDecrease}
              className={`${controlClass} font-sign text-xs font-bold`}
              title="글자 크기 줄이기"
              aria-label="글자 크기 줄이기"
            >
              A-
            </button>
            <button
              type="button"
              onClick={increase}
              disabled={!canIncrease}
              className={`${controlClass} font-sign text-base font-bold`}
              title="글자 크기 키우기"
              aria-label="글자 크기 키우기"
            >
              A+
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={controlClass}
              title={theme === 'dark' ? '주간 화면으로 전환' : '야간 화면으로 전환'}
              aria-label={theme === 'dark' ? '주간 화면으로 전환' : '야간 화면으로 전환'}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
                  <circle cx="10" cy="10" r="3.5" />
                  <path strokeLinecap="round" d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
                  <path strokeLinejoin="round" d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        {currentId && (
          <ChatContainer
            key={currentId}
            initialEvents={activeConversation?.events}
            initialMessages={activeConversation?.messages}
            onSave={handleSave}
            onStreamingChange={setIsStreaming}
            onStatusChange={setBoardStatus}
          />
        )}
      </main>
    </div>
  );
}
