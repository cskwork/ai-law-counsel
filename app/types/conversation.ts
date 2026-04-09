import type { ChatEvent } from '@/app/components/chat/MessageList';

/** 대화 유형 */
export type ConversationType = 'chat' | 'document-analysis' | 'template-generation';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  events: ChatEvent[];
  /** 대화 유형 (기존 대화는 "chat" 기본값) */
  type?: ConversationType;
}
