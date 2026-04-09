import { describe, expect, it } from 'vitest';
import {
  composeArticleNumber,
  formatArticleLabel,
  normalizeArticleNumber,
  toLawServiceArticleCode,
} from '@/lib/law/article-number';

describe('article-number', () => {
  it('단순 조문 번호를 정규화해야 한다', () => {
    expect(normalizeArticleNumber('8')).toBe('8');
    expect(normalizeArticleNumber('제8조')).toBe('8');
  });

  it('의 조문 번호를 다양한 입력 형식에서 정규화해야 한다', () => {
    expect(normalizeArticleNumber('3의2')).toBe('3-2');
    expect(normalizeArticleNumber('3-2')).toBe('3-2');
    expect(normalizeArticleNumber('제3조의2')).toBe('3-2');
  });

  it('조문 라벨을 law.go.kr 친화 형식으로 변환해야 한다', () => {
    expect(formatArticleLabel('3-2')).toBe('제3조의2');
    expect(formatArticleLabel('제8조')).toBe('제8조');
  });

  it('JO 파라미터 6자리 형식으로 변환해야 한다', () => {
    expect(toLawServiceArticleCode('8')).toBe('000800');
    expect(toLawServiceArticleCode('3의2')).toBe('000302');
    expect(toLawServiceArticleCode('제10조의2')).toBe('001002');
  });

  it('API 응답 필드에서 조문 번호를 조합해야 한다', () => {
    expect(composeArticleNumber(8, 0)).toBe('8');
    expect(composeArticleNumber(3, 2)).toBe('3-2');
    expect(composeArticleNumber('제8조')).toBe('8');
  });
});
