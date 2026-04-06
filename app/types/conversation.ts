import type { ChatEvent } from '@/app/components/chat/MessageList';

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
}
