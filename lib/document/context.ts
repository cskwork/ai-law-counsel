import { SUPPORTED_FILE_TYPES, MAX_EXTRACTED_TEXT_LENGTH } from '@/lib/constants';
import type { ValidationResult } from './validator';

/** 문서 분석 컨텍스트 */
export interface DocumentContext {
  readonly fileName: string;
  readonly fileType: 'pdf' | 'docx' | 'txt';
  readonly fileSize: number;
  readonly extractedText: string;
  readonly extractedTextLength: number;
}

/** documentContext 검증 */
export function validateDocumentContext(ctx: DocumentContext): ValidationResult {
  if (!ctx.fileName || !ctx.fileType || !ctx.extractedText) {
    return { valid: false, error: '문서 컨텍스트에 필수 필드가 누락되었습니다.' };
  }

  if (!(SUPPORTED_FILE_TYPES as readonly string[]).includes(ctx.fileType)) {
    return { valid: false, error: `지원하지 않는 파일 형식입니다: ${ctx.fileType}` };
  }

  if (ctx.extractedText.length === 0) {
    return { valid: false, error: '추출된 텍스트가 비어있습니다.' };
  }

  if (ctx.extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
    return {
      valid: false,
      error: `추출된 텍스트가 50,000자를 초과합니다. (${ctx.extractedText.length}자)`,
    };
  }

  return { valid: true };
}
