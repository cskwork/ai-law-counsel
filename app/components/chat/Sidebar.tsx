'use client';

import { useCallback } from 'react';
import type { StoredConversation } from '@/app/types/conversation';

interface SidebarProps {
  conversations: StoredConversation[];
  activeId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

// 상대 시간 표시 (예: "방금", "5분 전", "3일 전")
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// 토글 접이식 사이드바 (대화 히스토리)
export function Sidebar({
  conversations,
  activeId,
  isOpen,
  onToggle,
  onSelect,
  onNew,
  onDelete,
  onDeleteAll,
}: SidebarProps) {
  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDelete(id);
    },
    [onDelete]
  );

  const handleDeleteAll = useCallback(() => {
    if (conversations.length === 0) return;
    onDeleteAll();
  }, [conversations.length, onDeleteAll]);

  return (
    <>
      {/* 배경 딤 */}
      <div
        className={`
          fixed inset-0 z-30 bg-black/30 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
        onClick={onToggle}
      />

      {/* 사이드바 패널 */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-zinc-200
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 상단: 새 채팅 + 닫기 */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3">
          <button
            onClick={onNew}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            새 채팅
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            title="사이드바 닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* 대화 목록 */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-zinc-400">
              대화 기록이 없습니다
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => onSelect(conv.id)}
                    className={`
                      group/item flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors
                      ${
                        activeId === conv.id
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }
                    `}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{conv.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {formatRelativeTime(conv.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="ml-2 shrink-0 rounded-md p-1 text-zinc-300 opacity-0 transition-all hover:bg-zinc-200 hover:text-zinc-600 group-hover/item:opacity-100"
                      title="삭제"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.798l-.5 5.5a.75.75 0 0 1-1.498-.136l.5-5.5a.75.75 0 0 1 .798-.662Zm2.84 0a.75.75 0 0 1 .798.662l.5 5.5a.75.75 0 1 1-1.498.136l-.5-5.5a.75.75 0 0 1 .7-.798Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* 하단: 전체 삭제 */}
        {conversations.length > 0 && (
          <div className="border-t border-zinc-200 px-3 py-3">
            <button
              onClick={handleDeleteAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.798l-.5 5.5a.75.75 0 0 1-1.498-.136l.5-5.5a.75.75 0 0 1 .798-.662Zm2.84 0a.75.75 0 0 1 .798.662l.5 5.5a.75.75 0 1 1-1.498.136l-.5-5.5a.75.75 0 0 1 .7-.798Z"
                  clipRule="evenodd"
                />
              </svg>
              전체 삭제
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
