import { describe, expect, it } from 'vitest';
import { parseTheme, resolveTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '@/lib/theme';

describe('theme', () => {
  it('유효한 저장값만 테마로 인정한다', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('sepia')).toBeNull();
    expect(parseTheme(null)).toBeNull();
  });

  it('저장값이 시스템 설정보다 우선한다', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('garbage', false)).toBe('light');
  });

  it('초기화 스크립트는 같은 저장 키를 읽는다', () => {
    expect(THEME_INIT_SCRIPT).toContain(THEME_STORAGE_KEY);
  });
});
