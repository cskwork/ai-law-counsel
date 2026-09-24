import { describe, expect, it } from 'vitest';
import { isDegenerateRepetition, isPlanningMessage } from '@/lib/chat/answer-guard';

describe('isPlanningMessage', () => {
  it.each([
    '판례 확인이 완료되었습니다. 이제 핵심 법조문인 근로기준법의 해고 제한 조항과 구제 절차 조항을 상세 조회하겠습니다.',
    '핵심 조문들(제23조, 제28조)의 상세 내용을 확인하겠습니다.',
    '관련 법령을 검색해 보겠습니다.',
    '다음 자료를 정리합니다:',
    '',
    '   ',
  ])('계획·예고 문장으로 판별한다: %s', (text) => {
    expect(isPlanningMessage(text)).toBe(true);
  });

  it.each([
    '안녕하세요! 무엇을 도와드릴까요?',
    '근로계약서 작성을 도와드릴게요. 먼저 사업주 이름과 근로자 이름을 알려주세요.',
    '## 한눈에 보기\n부당해고등이 있었던 날부터 3개월 이내에 구제신청을 하세요.\n\n이 답변은 AI 기반 법률 정보이며, 정식 법률 자문이 아닙니다.',
    `${'가'.repeat(700)} 확인하겠습니다.`,
  ])('완성된 답변으로 판별한다: %s', (text) => {
    expect(isPlanningMessage(text)).toBe(false);
  });
});

describe('isDegenerateRepetition', () => {
  it('같은 단어가 끝없이 반복되면 true', () => {
    expect(isDegenerateRepetition(`확인했습니다.${' Kavanaugh'.repeat(100)}`)).toBe(true);
  });

  it('정상적인 긴 한국어 답변은 false', () => {
    const answer = Array.from({ length: 60 }, (_, i) => `${i + 1}. 근로자는 노동위원회에 구제를 신청할 수 있습니다.`).join('\n');
    expect(isDegenerateRepetition(answer)).toBe(false);
  });

  it('짧은 텍스트는 판단하지 않는다', () => {
    expect(isDegenerateRepetition('네 네 네')).toBe(false);
  });
});
