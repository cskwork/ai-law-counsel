'use client';

import { useState, useCallback, useEffect } from 'react';
import type { StoredConversation, Message } from '@/app/types/conversation';
import type { ChatEvent } from '@/app/components/chat/MessageList';

const STORAGE_KEY = 'law-counsel-conversations';
const MAX_CONVERSATIONS = 50;
const MAX_TITLE_LENGTH = 50;

// localStorage에서 대화 목록 로드 (updatedAt 내림차순 정렬)
function loadConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredConversation[] = JSON.parse(raw);
    return parsed.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

// localStorage에 대화 목록 저장 (QuotaExceededError 처리 포함)
function persistConversations(conversations: StoredConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // 80%까지 트리밍 후 재시도
      const trimmed = conversations.slice(0, Math.floor(MAX_CONVERSATIONS * 0.8));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // 최후 수단: 전체 삭제
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
}

// 첫 사용자 메시지에서 제목 추출
function extractTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return '새 대화';
  const title = firstUserMessage.content.trim();
  return title.length > MAX_TITLE_LENGTH
    ? title.slice(0, MAX_TITLE_LENGTH) + '...'
    : title;
}

export interface UseConversationHistoryReturn {
  conversations: StoredConversation[];
  activeId: string | null;
  createNew: () => string;
  save: (id: string, messages: Message[], events: ChatEvent[]) => void;
  load: (id: string) => StoredConversation | null;
  remove: (id: string) => void;
  removeAll: () => void;
  setActiveId: (id: string | null) => void;
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // hydration 이후 localStorage에서 대화 목록 로드
  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  const createNew = useCallback((): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newConversation: StoredConversation = {
      id,
      title: '새 대화',
      createdAt: now,
      updatedAt: now,
      messages: [],
      events: [],
    };

    setConversations((prev) => {
      const updated = [newConversation, ...prev].slice(0, MAX_CONVERSATIONS);
      persistConversations(updated);
      return updated;
    });
    setActiveId(id);
    return id;
  }, []);

  const save = useCallback((id: string, messages: Message[], events: ChatEvent[]): void => {
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      const now = new Date().toISOString();

      if (index === -1) {
        // 새 대화 자동 생성
        const newConversation: StoredConversation = {
          id,
          title: extractTitle(messages),
          createdAt: now,
          updatedAt: now,
          messages,
          events,
        };
        const updated = [newConversation, ...prev].slice(0, MAX_CONVERSATIONS);
        persistConversations(updated);
        return updated;
      }

      const updated = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: c.title === '새 대화' ? extractTitle(messages) : c.title,
              updatedAt: now,
              messages,
              events,
            }
          : c
      );
      // 업데이트된 대화를 맨 앞으로
      const target = updated.find((c) => c.id === id)!;
      const rest = updated.filter((c) => c.id !== id);
      const sorted = [target, ...rest];
      persistConversations(sorted);
      return sorted;
    });
  }, []);

  const load = useCallback(
    (id: string): StoredConversation | null => {
      return conversations.find((c) => c.id === id) ?? null;
    },
    [conversations]
  );

  const remove = useCallback(
    (id: string): void => {
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        persistConversations(updated);
        return updated;
      });
      if (activeId === id) {
        setActiveId(null);
      }
    },
    [activeId]
  );

  const removeAll = useCallback((): void => {
    setConversations([]);
    setActiveId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    conversations,
    activeId,
    createNew,
    save,
    load,
    remove,
    removeAll,
    setActiveId,
  };
}
