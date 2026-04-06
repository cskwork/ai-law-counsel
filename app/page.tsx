'use client';

import { useState, useCallback, useRef } from 'react';
import { Disclaimer } from '@/app/components/common/Disclaimer';
import { ChatContainer } from '@/app/components/chat/ChatContainer';
import { Sidebar } from '@/app/components/chat/Sidebar';
import { useConversationHistory } from '@/app/hooks/useConversationHistory';

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

  // 새 대화용 안정 ID (activeId가 null일 때 사용)
  const pendingIdRef = useRef(crypto.randomUUID());

  // 현재 대화 ID: 기존 대화 또는 새 대화의 pending ID
  const currentId = activeId ?? pendingIdRef.current;

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleNewChat = useCallback(() => {
    if (isStreaming) return; // 스트리밍 중 새 채팅 방지
    setActiveId(null);
    pendingIdRef.current = crypto.randomUUID();
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50">
      <Disclaimer />
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={remove}
        onDeleteAll={removeAll}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-4 py-3">
            <div className="flex items-center justify-center relative max-w-3xl mx-auto">
              <button
                onClick={handleToggleSidebar}
                className="absolute left-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                title="대화 목록"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <h1 className="text-base font-semibold tracking-tight text-zinc-900">
                법률 상담 AI
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatContainer
              key={currentId}
              initialEvents={activeConversation?.events}
              initialMessages={activeConversation?.messages}
              onSave={handleSave}
              onStreamingChange={setIsStreaming}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
