import { describe, expect, it } from 'vitest';
import { validateChatRequest } from '@/lib/chat/request-validation';

describe('validateChatRequest', () => {
  it('사용자 메시지는 2000자를 초과하면 거부해야 한다', () => {
    expect(() =>
      validateChatRequest({
        messages: [{ role: 'user', content: 'a'.repeat(2001) }],
      }),
    ).toThrowError(/2000/);
  });

  it('긴 assistant 메시지가 있어도 후속 사용자 질문은 통과해야 한다', () => {
    const result = validateChatRequest({
      messages: [
        { role: 'user', content: '초기 질문입니다.' },
        { role: 'assistant', content: 'a'.repeat(2001) },
        { role: 'user', content: '이어서 대화할게요.' },
      ],
    });

    expect(result.messages).toHaveLength(3);
    expect(result.messages[1]?.content.length).toBe(2001);
  });

  it('assistant 메시지도 과도하게 크면 거부해야 한다', () => {
    expect(() =>
      validateChatRequest({
        messages: [
          { role: 'user', content: '초기 질문입니다.' },
          { role: 'assistant', content: 'a'.repeat(50001) },
        ],
      }),
    ).toThrowError(/assistant 메시지 길이/);
  });
});
