import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, validateFile } from '@/lib/document/validator';

describe('문서 검증기', () => {
  describe('validateFileType', () => {
    it('PDF 파일을 허용해야 한다', () => {
      expect(validateFileType('contract.pdf')).toEqual({ valid: true });
    });

    it('DOCX 파일을 허용해야 한다', () => {
      expect(validateFileType('contract.docx')).toEqual({ valid: true });
    });

    it('TXT 파일을 허용해야 한다', () => {
      expect(validateFileType('memo.txt')).toEqual({ valid: true });
    });

    it('대소문자 구분 없이 허용해야 한다', () => {
      expect(validateFileType('FILE.PDF')).toEqual({ valid: true });
      expect(validateFileType('FILE.Docx')).toEqual({ valid: true });
    });

    it('지원하지 않는 형식을 거부해야 한다', () => {
      const result = validateFileType('image.png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('확장자가 없는 파일을 거부해야 한다', () => {
      const result = validateFileType('noextension');
      expect(result.valid).toBe(false);
    });

    it('빈 파일명을 거부해야 한다', () => {
      const result = validateFileType('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('제한 이내의 파일을 허용해야 한다', () => {
      expect(validateFileSize(1000)).toEqual({ valid: true });
    });

    it('정확히 최대 크기인 파일을 허용해야 한다', () => {
      expect(validateFileSize(4_500_000)).toEqual({ valid: true });
    });

    it('크기 초과 파일을 거부해야 한다', () => {
      const result = validateFileSize(4_500_001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4.5MB');
    });

    it('빈 파일(0 바이트)을 거부해야 한다', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('비어');
    });
  });

  describe('validateFile', () => {
    it('유효한 파일을 통과시켜야 한다', () => {
      expect(validateFile('contract.pdf', 1000)).toEqual({ valid: true });
    });

    it('형식이 잘못된 파일을 거부해야 한다', () => {
      const result = validateFile('image.png', 1000);
      expect(result.valid).toBe(false);
    });

    it('크기가 초과된 파일을 거부해야 한다', () => {
      const result = validateFile('contract.pdf', 5_000_000);
      expect(result.valid).toBe(false);
    });
  });
});
