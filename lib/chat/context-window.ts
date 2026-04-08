import { MAX_CONTEXT_CHARACTERS, MAX_CONTEXT_MESSAGES } from '@/lib/constants';
import type { ChatMessage } from '@/lib/zai/types';

interface ContextWindowOptions {
  maxMessages?: number;
  maxCharacters?: number;
}

/**
 * 최근 대화를 연속된 suffix로 잘라 모델에 전달한다.
 * - 최신 메시지는 예산을 초과해도 반드시 포함
 * - 문자 수 또는 메시지 수를 넘기면 그 이전 맥락은 제외
 */
export function buildContextWindow(
  messages: readonly Pick<ChatMessage, 'role' | 'content'>[],
  options: ContextWindowOptions = {},
): ChatMessage[] {
  const maxMessages = options.maxMessages ?? MAX_CONTEXT_MESSAGES;
  const maxCharacters = options.maxCharacters ?? MAX_CONTEXT_CHARACTERS;

  const window: ChatMessage[] = [];
  let totalCharacters = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const nextTotal = totalCharacters + message.content.length;
    const hasSelectedMessages = window.length > 0;

    if (window.length >= maxMessages) {
      break;
    }

    if (hasSelectedMessages && nextTotal > maxCharacters) {
      break;
    }

    window.unshift({
      role: message.role,
      content: message.content,
    });
    totalCharacters = nextTotal;
  }

  return window;
}
