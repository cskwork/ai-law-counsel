import { describe, it, expect, vi } from 'vitest';
import { extractFromPdf, extractFromDocx, extractFromTxt, extractText } from '@/lib/document/extractor';

describe('문서 추출기', () => {
  describe('extractFromPdf', () => {
    it('PDF 버퍼에서 텍스트를 추출해야 한다', async () => {
      const mockPdfParse = vi.fn().mockResolvedValue({ text: '제1조 (목적) 본 계약은...' });
      const buffer = Buffer.from('fake-pdf');

      const result = await extractFromPdf(buffer, { pdfParse: mockPdfParse });

      expect(result).toBe('제1조 (목적) 본 계약은...');
      expect(mockPdfParse).toHaveBeenCalledWith(buffer);
    });

    it('PDF 파싱 실패 시 에러를 던져야 한다', async () => {
      const mockPdfParse = vi.fn().mockRejectedValue(new Error('Invalid PDF'));
      const buffer = Buffer.from('not-a-pdf');

      await expect(extractFromPdf(buffer, { pdfParse: mockPdfParse })).rejects.toThrow(
        'PDF 텍스트 추출에 실패했습니다'
      );
    });
  });

  describe('extractFromDocx', () => {
    it('DOCX 버퍼에서 텍스트를 추출해야 한다', async () => {
      const mockMammoth = {
        extractRawText: vi.fn().mockResolvedValue({ value: '근로계약서 내용...' }),
      };
      const buffer = Buffer.from('fake-docx');

      const result = await extractFromDocx(buffer, { mammoth: mockMammoth });

      expect(result).toBe('근로계약서 내용...');
      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ buffer });
    });

    it('DOCX 파싱 실패 시 에러를 던져야 한다', async () => {
      const mockMammoth = {
        extractRawText: vi.fn().mockRejectedValue(new Error('Invalid DOCX')),
      };
      const buffer = Buffer.from('not-a-docx');

      await expect(extractFromDocx(buffer, { mammoth: mockMammoth })).rejects.toThrow(
        'DOCX 텍스트 추출에 실패했습니다'
      );
    });
  });

  describe('extractFromTxt', () => {
    it('TXT 버퍼에서 텍스트를 읽어야 한다', () => {
      const buffer = Buffer.from('텍스트 파일 내용입니다');

      const result = extractFromTxt(buffer);

      expect(result).toBe('텍스트 파일 내용입니다');
    });

    it('빈 버퍼를 빈 문자열로 반환해야 한다', () => {
      const buffer = Buffer.from('');

      const result = extractFromTxt(buffer);

      expect(result).toBe('');
    });
  });

  describe('extractText', () => {
    const mockDeps = {
      pdfParse: vi.fn().mockResolvedValue({ text: 'pdf content' }),
      mammoth: {
        extractRawText: vi.fn().mockResolvedValue({ value: 'docx content' }),
      },
    };

    it('PDF 파일의 텍스트를 추출해야 한다', async () => {
      const result = await extractText(Buffer.from('pdf'), 'pdf', mockDeps);

      expect(result).toBe('pdf content');
    });

    it('DOCX 파일의 텍스트를 추출해야 한다', async () => {
      const result = await extractText(Buffer.from('docx'), 'docx', mockDeps);

      expect(result).toBe('docx content');
    });

    it('TXT 파일의 텍스트를 읽어야 한다', async () => {
      const buffer = Buffer.from('plain text');
      const result = await extractText(buffer, 'txt', mockDeps);

      expect(result).toBe('plain text');
    });

    it('지원하지 않는 형식에 에러를 던져야 한다', async () => {
      await expect(
        extractText(Buffer.from(''), 'xlsx' as 'pdf', mockDeps)
      ).rejects.toThrow('지원하지 않는 파일 형식');
    });
  });
});
