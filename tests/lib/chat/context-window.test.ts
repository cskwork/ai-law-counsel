import { describe, expect, it } from 'vitest';
import { buildContextWindow } from '@/lib/chat/context-window';

describe('buildContextWindow', () => {
  it('예산 이내면 전체 메시지를 유지해야 한다', () => {
    const messages = [
      { role: 'user' as const, content: '안녕하세요' },
      { role: 'assistant' as const, content: '무엇을 도와드릴까요?' },
    ];

    expect(buildContextWindow(messages, { maxMessages: 10, maxCharacters: 100 }))
      .toEqual(messages);
  });

  it('총 문자 수를 넘기면 최근 연속 구간만 남겨야 한다', () => {
    const messages = [
      { role: 'user' as const, content: 'a'.repeat(10) },
      { role: 'assistant' as const, content: 'b'.repeat(10) },
      { role: 'user' as const, content: 'c'.repeat(10) },
      { role: 'assistant' as const, content: 'd'.repeat(10) },
    ];

    expect(buildContextWindow(messages, { maxMessages: 10, maxCharacters: 25 })).toEqual([
      { role: 'user', content: 'c'.repeat(10) },
      { role: 'assistant', content: 'd'.repeat(10) },
    ]);
  });

  it('최신 메시지는 예산을 초과해도 포함해야 한다', () => {
    const messages = [
      { role: 'user' as const, content: '짧은 이전 질문' },
      { role: 'assistant' as const, content: 'x'.repeat(30) },
    ];

    expect(buildContextWindow(messages, { maxMessages: 10, maxCharacters: 10 })).toEqual([
      { role: 'assistant', content: 'x'.repeat(30) },
    ]);
  });

  it('메시지 수 제한도 함께 적용해야 한다', () => {
    const messages = [
      { role: 'user' as const, content: '1' },
      { role: 'assistant' as const, content: '2' },
      { role: 'user' as const, content: '3' },
    ];

    expect(buildContextWindow(messages, { maxMessages: 2, maxCharacters: 100 })).toEqual([
      { role: 'assistant', content: '2' },
      { role: 'user', content: '3' },
    ]);
  });
});
