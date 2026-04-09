import {
  MAX_CONTEXT_MESSAGES,
  MAX_CONTEXT_MESSAGE_LENGTH,
  MAX_USER_MESSAGE_LENGTH,
} from '@/lib/constants';
import { validateDocumentContext, type DocumentContext } from '@/lib/document/context';
import type { ChatMessage, MessageRole } from '@/lib/zai/types';

export interface ChatRequestBody {
  messages: ChatMessage[];
  documentContext?: DocumentContext;
}

const ALLOWED_MESSAGE_ROLES: readonly MessageRole[] = ['system', 'user', 'assistant', 'tool'];

const MESSAGE_LENGTH_LIMITS: Readonly<Record<MessageRole, number>> = {
  system: MAX_CONTEXT_MESSAGE_LENGTH,
  user: MAX_USER_MESSAGE_LENGTH,
  assistant: MAX_CONTEXT_MESSAGE_LENGTH,
  tool: MAX_CONTEXT_MESSAGE_LENGTH,
};

function isMessageRole(value: unknown): value is MessageRole {
  return typeof value === 'string' && ALLOWED_MESSAGE_ROLES.includes(value as MessageRole);
}

function getMessageLengthLimit(role: MessageRole): number {
  return MESSAGE_LENGTH_LIMITS[role];
}

function getLengthErrorMessage(role: MessageRole, limit: number): string {
  if (role === 'user') {
    return `메시지 길이는 최대 ${limit}자까지 가능합니다`;
  }

  return `${role} 메시지 길이는 최대 ${limit.toLocaleString()}자까지 가능합니다`;
}

/** 채팅 요청 본문을 검증하고 타입을 확정한다 */
export function validateChatRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('요청 본문이 비어있습니다');
  }

  const { messages, documentContext } = body as Record<string, unknown>;

  if (!Array.isArray(messages)) {
    throw new Error('messages는 배열이어야 합니다');
  }

  if (messages.length === 0) {
    throw new Error('메시지가 비어있습니다');
  }

  if (messages.length > MAX_CONTEXT_MESSAGES) {
    throw new Error(`메시지는 최대 ${MAX_CONTEXT_MESSAGES}개까지 가능합니다`);
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      throw new Error('각 메시지에는 role과 content가 필요합니다');
    }

    const { role, content } = msg as Record<string, unknown>;
    if (!isMessageRole(role) || typeof content !== 'string' || content.length === 0) {
      throw new Error('각 메시지에는 role과 content가 필요합니다');
    }

    const limit = getMessageLengthLimit(role);
    if (content.length > limit) {
      throw new Error(getLengthErrorMessage(role, limit));
    }
  }

  if (documentContext) {
    const docValidation = validateDocumentContext(documentContext as DocumentContext);
    if (!docValidation.valid) {
      throw new Error(docValidation.error);
    }
  }

  return {
    messages: messages as ChatMessage[],
    documentContext: documentContext as DocumentContext | undefined,
  };
}
