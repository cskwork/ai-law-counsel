'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  /** 답변 생성 중단 (스트리밍 중에만 노출) */
  onStop?: () => void;
  disabled: boolean;
  streaming?: boolean;
}

// 메시지 입력 컴포넌트 (자동 높이 조절, 스트리밍 중에는 중단 버튼)
export function ChatInput({ onSend, onStop, disabled, streaming = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중 Enter는 전송하지 않음
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const showStop = streaming && onStop;

  return (
    <div className="mx-auto max-w-6xl px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
      <div className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          법률 관련 질문
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="법률 관련 질문을 입력하세요..."
          rows={1}
          className="min-h-[3rem] flex-1 resize-none rounded-[4px] border border-rule-strong bg-paper-2 px-4 py-3 text-base leading-normal text-ink placeholder:text-ink-3 transition-colors focus:border-sign focus:bg-paper focus:outline-none focus:ring-2 focus:ring-sign/25 disabled:opacity-60"
        />
        {showStop ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-12 shrink-0 items-center gap-2 rounded-[4px] border border-error/60 bg-paper px-4 font-sign text-[0.95rem] font-bold text-error transition-colors hover:bg-error-tint"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-[2px] bg-current" />
            중단
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="flex h-12 shrink-0 items-center gap-2 rounded-[4px] bg-sign px-5 font-sign text-[0.95rem] font-bold text-sign-ink transition-[background-color,transform] duration-150 hover:bg-sign-hover active:translate-y-px disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-3"
          >
            접수
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h9.5M8.5 4 12.5 8l-4 4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
