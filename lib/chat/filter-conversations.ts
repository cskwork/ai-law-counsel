import type { StoredConversation } from '@/app/types/conversation';

/**
 * 대화 목록 검색: 제목 또는 메시지 본문에 검색어(공백 구분 모든 단어)가 포함된 대화만 반환.
 * 빈 검색어는 전체 목록을 그대로 반환한다.
 */
export function filterConversations(
  conversations: readonly StoredConversation[],
  query: string
): StoredConversation[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...conversations];

  return conversations.filter((conv) => {
    const haystack = [conv.title, ...conv.messages.map((m) => m.content)]
      .join('\n')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
