'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { StoredConversation } from '@/app/types/conversation';
import { filterConversations } from '@/lib/chat/filter-conversations';

interface SidebarProps {
  conversations: StoredConversation[];
  activeId: string | null;
  isOpen: boolean;
  /** 답변 생성 중에는 전환·새 채팅을 막음 */
  disabled?: boolean;
  onClose: () => void;
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

const TRASH_PATH =
  'M6.5 2.5h3M3 4.5h10M4.5 4.5l.6 8.4c.05.6.55 1.1 1.15 1.1h3.5c.6 0 1.1-.5 1.15-1.1l.6-8.4M6.75 7v4.5M9.25 7v4.5';

// 접수 기록 서랍 (대화 히스토리: 검색 + 안전한 삭제)
export function Sidebar({
  conversations,
  activeId,
  isOpen,
  disabled = false,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onDeleteAll,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterConversations(conversations, query), [conversations, query]);

  // 열릴 때 검색창 포커스, 닫힐 때 확인 상태 초기화
  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus({ preventScroll: true });
    } else {
      setConfirmingDeleteAll(false);
    }
  }, [isOpen]);

  // Escape로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleConfirmDeleteAll = useCallback(() => {
    onDeleteAll();
    setConfirmingDeleteAll(false);
    setQuery('');
  }, [onDeleteAll]);

  return (
    <>
      {/* 배경 딤 */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-ink/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        id="conversation-drawer"
        aria-label="대화 목록"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,88vw)] flex-col bg-ground shadow-lift transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        {/* 상단: 새 채팅 + 닫기 */}
        <div className="flex items-center justify-between gap-2 bg-sign px-3 py-2.5 text-sign-ink">
          <button
            type="button"
            onClick={onNew}
            disabled={disabled}
            className="flex h-9 items-center gap-2 rounded-[3px] bg-sign-ink px-3 font-sign text-sm font-bold text-sign transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
              <path strokeLinecap="round" d="M8 3v10M3 8h10" />
            </svg>
            새 채팅
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[3px] text-sign-ink-2 transition-colors hover:bg-sign-ink/10 hover:text-sign-ink"
            title="사이드바 닫기"
            aria-label="대화 목록 닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* 제목 + 검색 */}
        <div className="border-b border-rule px-3 pb-3 pt-3.5">
          <h2 className="mb-2 flex items-baseline justify-between font-sign text-sm font-extrabold text-ink">
            대화 목록
            <span className="tabular font-body text-xs font-normal text-ink-3">{conversations.length}건</span>
          </h2>
          <label htmlFor="conversation-search" className="sr-only">대화 검색</label>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true">
              <circle cx="7" cy="7" r="4.25" />
              <path strokeLinecap="round" d="m10.25 10.25 3 3" />
            </svg>
            <input
              ref={searchRef}
              id="conversation-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="대화 검색"
              autoComplete="off"
              className="h-9 w-full rounded-[3px] border border-rule-strong bg-paper pl-8 pr-8 text-sm text-ink placeholder:text-ink-3 focus:border-sign focus:outline-none focus:ring-2 focus:ring-sign/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[3px] text-ink-3 hover:text-ink"
                aria-label="검색어 지우기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3 w-3" aria-hidden="true">
                  <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 대화 목록 */}
        <nav aria-label="저장된 대화" className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <Image
                src="/images/empty-history.webp"
                unoptimized
                width={160}
                height={160}
                alt=""
                className="mb-3 h-28 w-28 rounded-[4px] opacity-90"
              />
              <p className="text-sm font-medium text-ink">대화 기록이 없습니다</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-3">질문을 접수하면 이 기기에만 저장됩니다.</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-3" role="status">
              &ldquo;{query.trim()}&rdquo;에 맞는 대화가 없습니다
            </p>
          ) : (
            <ul className="space-y-1">
              {visible.map((conv) => {
                const active = activeId === conv.id;
                return (
                  <li
                    key={conv.id}
                    className={`group flex items-stretch rounded-[3px] transition-colors ${
                      active ? 'bg-paper shadow-paper' : 'hover:bg-paper/70'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conv.id)}
                      disabled={disabled && !active}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 px-3.5 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className={`block truncate text-sm ${active ? 'font-bold text-ink' : 'font-medium text-ink-2'}`}>
                        {conv.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-3">
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conv.id)}
                      disabled={disabled && active}
                      className="mr-1 grid w-8 shrink-0 place-items-center self-center rounded-[3px] py-1.5 text-ink-3 transition-[opacity,color,background-color] hover:bg-error-tint hover:text-error focus-visible:opacity-100 disabled:hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      title="삭제"
                      aria-label={`"${conv.title}" 대화 삭제`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-3.5 w-3.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={TRASH_PATH} />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* 하단: 전체 삭제 (2단계 확인) */}
        {conversations.length > 0 && (
          <div className="border-t border-rule px-3 py-3">
            {confirmingDeleteAll ? (
              <div role="alertdialog" aria-label="전체 삭제 확인" className="rounded-[3px] border border-error/40 bg-error-tint p-3">
                <p className="text-xs leading-relaxed text-ink">
                  저장된 대화 {conversations.length}건을 모두 삭제할까요? 되돌릴 수 없습니다.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAll}
                    disabled={disabled}
                    className="flex-1 rounded-[3px] bg-error px-3 py-1.5 font-sign text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    모두 삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteAll(false)}
                    autoFocus
                    className="flex-1 rounded-[3px] border border-rule-strong bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper-2"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDeleteAll(true)}
                disabled={disabled}
                className="flex w-full items-center justify-center gap-2 rounded-[3px] px-3 py-2 text-xs text-ink-3 transition-colors hover:bg-error-tint hover:text-error disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-3.5 w-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={TRASH_PATH} />
                </svg>
                전체 삭제
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
