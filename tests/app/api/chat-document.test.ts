import { describe, it, expect } from 'vitest';
import { validateDocumentContext, type DocumentContext } from '@/lib/document/context';

describe('documentContext 검증', () => {
  const validContext: DocumentContext = {
    fileName: '계약서.pdf',
    fileType: 'pdf',
    fileSize: 100000,
    extractedText: '제1조 계약 내용...',
    extractedTextLength: 15,
  };

  it('유효한 documentContext를 통과시켜야 한다', () => {
    const result = validateDocumentContext(validContext);
    expect(result.valid).toBe(true);
  });

  it('extractedText가 50,000자를 초과하면 거부해야 한다', () => {
    const longText = 'a'.repeat(50_001);
    const result = validateDocumentContext({
      ...validContext,
      extractedText: longText,
      extractedTextLength: longText.length,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('50,000');
  });

  it('필수 필드가 누락되면 거부해야 한다', () => {
    const result = validateDocumentContext({
      fileName: '계약서.pdf',
    } as DocumentContext);

    expect(result.valid).toBe(false);
  });

  it('빈 extractedText를 거부해야 한다', () => {
    const result = validateDocumentContext({
      ...validContext,
      extractedText: '',
      extractedTextLength: 0,
    });

    expect(result.valid).toBe(false);
  });

  it('지원하지 않는 fileType을 거부해야 한다', () => {
    const result = validateDocumentContext({
      ...validContext,
      fileType: 'xlsx' as 'pdf',
    });

    expect(result.valid).toBe(false);
  });
});
