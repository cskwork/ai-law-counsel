import { describe, expect, it } from 'vitest';
import { filterConversations } from '@/lib/chat/filter-conversations';
import type { StoredConversation } from '@/app/types/conversation';

function conv(id: string, title: string, contents: string[] = []): StoredConversation {
  return {
    id,
    title,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    messages: contents.map((content) => ({ role: 'user' as const, content })),
    events: [],
  };
}

const list = [
  conv('a', '전세 보증금을 돌려받지 못하면', ['전세 보증금 반환 소송']),
  conv('b', '근로계약서 만들어줘', ['수습 기간 3개월']),
  conv('c', 'Refund 거부', ['온라인 쇼핑 환불']),
];

describe('filterConversations', () => {
  it('빈 검색어는 전체 목록을 반환한다', () => {
    expect(filterConversations(list, '   ').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('제목으로 찾는다', () => {
    expect(filterConversations(list, '근로계약').map((c) => c.id)).toEqual(['b']);
  });

  it('메시지 본문으로도 찾는다', () => {
    expect(filterConversations(list, '수습').map((c) => c.id)).toEqual(['b']);
  });

  it('여러 단어는 모두 포함해야 하고 대소문자를 구분하지 않는다', () => {
    expect(filterConversations(list, 'refund 환불').map((c) => c.id)).toEqual(['c']);
    expect(filterConversations(list, '전세 수습')).toEqual([]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const result = filterConversations(list, '');
    expect(result).not.toBe(list);
    expect(result).toEqual(list);
  });
});
