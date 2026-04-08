import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/lib/constants';

/** 검증 결과 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

/** 파일 확장자 추출 (소문자) */
function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/** 파일 형식 검증 */
export function validateFileType(fileName: string): ValidationResult {
  if (!fileName) {
    return { valid: false, error: '파일명이 비어있습니다.' };
  }

  const ext = getExtension(fileName);
  if (!ext || !(SUPPORTED_FILE_TYPES as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. ${SUPPORTED_FILE_TYPES.join(', ').toUpperCase()} 파일만 업로드 가능합니다.`,
    };
  }

  return { valid: true };
}

/** 파일 크기 검증 */
export function validateFileSize(size: number): ValidationResult {
  if (size === 0) {
    return { valid: false, error: '파일이 비어있습니다.' };
  }

  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: '파일 크기가 4.5MB를 초과합니다.' };
  }

  return { valid: true };
}

/** 파일 종합 검증 (형식 + 크기) */
export function validateFile(fileName: string, size: number): ValidationResult {
  const typeResult = validateFileType(fileName);
  if (!typeResult.valid) return typeResult;

  return validateFileSize(size);
}
