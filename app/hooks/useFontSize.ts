'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'font-size-level';
const MIN_LEVEL = 0;
const MAX_LEVEL = 4;
const DEFAULT_LEVEL = 2;

// 14px ~ 18px (1px 단위)
const FONT_SIZES = [14, 15, 16, 17, 18] as const;

/** 폰트 크기 조절 훅 (localStorage 영속 + rem 스케일링) */
export function useFontSize() {
  const [level, setLevel] = useState(DEFAULT_LEVEL);

  // 초기화: localStorage에서 복원
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (parsed >= MIN_LEVEL && parsed <= MAX_LEVEL) {
        setLevel(parsed);
      }
    }
  }, []);

  // level 변경 시 루트 font-size 적용 + 저장
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[level]}px`;
    localStorage.setItem(STORAGE_KEY, String(level));
  }, [level]);

  const increase = useCallback(() => {
    setLevel((prev) => Math.min(prev + 1, MAX_LEVEL));
  }, []);

  const decrease = useCallback(() => {
    setLevel((prev) => Math.max(prev - 1, MIN_LEVEL));
  }, []);

  return {
    level,
    sizePx: FONT_SIZES[level],
    canIncrease: level < MAX_LEVEL,
    canDecrease: level > MIN_LEVEL,
    increase,
    decrease,
  };
}
