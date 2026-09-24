// 테마(주간/야간 창구) 공용 상수와 순수 헬퍼

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'law-counsel-theme';

/** 저장값이 유효한 테마인지 판별 */
export function parseTheme(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** 저장값 우선, 없으면 시스템 설정을 따름 */
export function resolveTheme(stored: string | null | undefined, prefersDark: boolean): Theme {
  return parseTheme(stored) ?? (prefersDark ? 'dark' : 'light');
}

/**
 * 첫 페인트 전에 실행되는 인라인 스크립트 (layout <head>).
 * 저장된 테마 또는 시스템 설정을 <html data-theme>에 반영한다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;
