'use client';

import { useCallback } from 'react';

interface DocumentDownloadProps {
  content: string;
  fileName?: string;
}

// 어시스턴트 메시지의 문서 다운로드 + 클립보드 복사
export function DocumentDownload({ content, fileName = '법률문서.txt' }: DocumentDownloadProps) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, fileName]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
  }, [content]);

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
          <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
        </svg>
        다운로드
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5v7a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 10.5v-7Z" />
          <path d="M3 5a1 1 0 0 0-1 1v6.5A2.5 2.5 0 0 0 4.5 15h5a1 1 0 1 0 0-2h-5a.5.5 0 0 1-.5-.5V6a1 1 0 0 0-1-1Z" />
        </svg>
        복사
      </button>
    </div>
  );
}
