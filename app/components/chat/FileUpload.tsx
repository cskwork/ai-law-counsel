'use client';

import { useState, useCallback, useRef } from 'react';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/lib/constants';

/** 업로드 결과 데이터 (upload API의 data를 그대로 전달받음) */
export interface UploadResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  extractedTextLength: number;
  /** 긴 문서가 maxLength로 잘렸는지 여부 (Unit 1 upload 응답) */
  truncated?: boolean;
  /** 잘리기 전 원본 텍스트 길이 (Unit 1 upload 응답) */
  originalTextLength?: number;
}

interface FileUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  disabled?: boolean;
}

/** 파일 확장자 추출 */
function getExtension(name: string): string {
  const parts = name.split('.');
  return parts.length >= 2 ? parts[parts.length - 1].toLowerCase() : '';
}

/** 파일 크기 포맷 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 파일 업로드 (드래그 앤 드롭 + 클릭)
export function FileUpload({ onUploadComplete, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    // 클라이언트 측 사전 검증
    const ext = getExtension(file.name);
    if (!(SUPPORTED_FILE_TYPES as readonly string[]).includes(ext)) {
      setError(`지원하지 않는 파일 형식입니다. ${SUPPORTED_FILE_TYPES.join(', ').toUpperCase()} 파일만 가능합니다.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`파일 크기가 ${formatSize(MAX_FILE_SIZE)}를 초과합니다. (${formatSize(file.size)})`);
      return;
    }
    if (file.size === 0) {
      setError('파일이 비어있습니다.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        setError(body.error ?? '업로드에 실패했습니다.');
        return;
      }

      onUploadComplete(body.data);
    } catch {
      setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // input 초기화 (같은 파일 재선택 허용)
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // 드롭존 열기 (클릭/키보드 공용)
  const openFileDialog = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  // Enter/Space로 파일 선택 트리거 (버튼 동작 모사)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  }, [openFileDialog]);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        aria-label="문서 업로드: PDF, DOCX, TXT 파일을 끌어놓거나 클릭 또는 Enter 키로 선택하세요"
        aria-busy={uploading}
        aria-disabled={disabled || uploading}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        className={`
          flex min-h-[2.5rem] cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-dashed px-3 py-2 text-[0.8rem] transition-colors
          ${dragOver
            ? 'border-way-law bg-way-law-tint text-ink'
            : 'border-rule-strong bg-paper-2 text-ink-2 hover:border-ink-3 hover:bg-paper'}
          ${(disabled || uploading) ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
        />
        {uploading ? (
          <span className="flex items-center gap-2 text-ink">
            <svg className="h-4 w-4 animate-spin text-sign" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            문서 분석 중...
          </span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v2.25c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V10" />
            </svg>
            <span className="text-center">
              <span className="font-sign font-bold tracking-wide text-ink">PDF, DOCX, TXT</span> 파일을 여기에 끌어놓거나 클릭하세요
            </span>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="px-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
