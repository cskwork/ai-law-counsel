'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

// 메시지 입력 컴포넌트 (자동 높이 조절)
export function ChatInput({ onSend, disabled }: ChatInputProps) {
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

  return (
    <div className="border-t border-border-default bg-surface-primary px-4 py-3 sm:py-4">
      <div className="flex items-end gap-2 max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="법률 관련 질문을 입력하세요..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border-default bg-surface-sunken px-4 py-3 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-authority-deep focus:border-2 focus:bg-surface-primary focus:outline-none disabled:opacity-50 transition-all duration-200"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-authority-deep px-5 py-3 text-sm font-medium text-ink-inverse transition-all duration-150 hover:bg-authority-mid active:scale-[0.97] disabled:bg-surface-sunken disabled:text-ink-tertiary disabled:cursor-not-allowed"
        >
          전송
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
