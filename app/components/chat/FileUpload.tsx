'use client';

import { useState, useCallback, useRef } from 'react';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/lib/constants';

/** 업로드 결과 데이터 */
export interface UploadResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  extractedTextLength: number;
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

  return (
    <div className="flex flex-col gap-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          flex items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors cursor-pointer
          ${dragOver
            ? 'border-accent-gold bg-accent-gold-light text-accent-gold-dim'
            : 'border-border-default bg-surface-sunken text-ink-tertiary hover:border-border-strong hover:bg-surface-elevated'}
          ${(disabled || uploading) ? 'opacity-50 cursor-not-allowed' : ''}
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
          <span className="flex items-center gap-2 text-ink-secondary">
            <svg className="h-4 w-4 animate-spin text-accent-gold" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            문서 분석 중...
          </span>
        ) : (
          <span>
            <span className="font-medium text-ink-secondary tracking-wide">PDF, DOCX, TXT</span> 파일을 여기에 끌어놓거나 클릭하세요
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-status-error px-1">{error}</p>
      )}
    </div>
  );
}
