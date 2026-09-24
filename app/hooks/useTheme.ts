'use client';

import { useState, useCallback, useEffect } from 'react';
import { THEME_STORAGE_KEY, resolveTheme, type Theme } from '@/lib/theme';

/** 주간/야간 테마 토글 훅 (localStorage 영속, 미설정 시 시스템 설정 추종) */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // hydration 이후 실제 적용된 테마와 동기화
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // 저장소 접근 불가 시 시스템 설정 사용
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    setTheme(resolveTheme(stored, prefersDark));
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // 저장 실패는 무시 (현재 세션에는 적용됨)
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
