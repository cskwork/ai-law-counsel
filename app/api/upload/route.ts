import { validateFile } from '@/lib/document/validator';
import { extractFromTxt, extractFromPdf, extractFromDocx } from '@/lib/document/extractor';
import { MAX_EXTRACTED_TEXT_LENGTH } from '@/lib/constants';

/** 파일명에서 확장자 추출 */
function getFileType(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length >= 2 ? parts[parts.length - 1].toLowerCase() : '';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json(
        { success: false, error: '파일이 첨부되지 않았습니다.' },
        { status: 400 },
      );
    }

    const fileName = file.name;
    const fileSize = file.size;

    // 파일 검증
    const validation = validateFile(fileName, fileSize);
    if (!validation.valid) {
      const status = validation.error?.includes('4.5MB') ? 413 : 400;
      return Response.json(
        { success: false, error: validation.error },
        { status },
      );
    }

    // 파일 버퍼 읽기 및 텍스트 추출 (형식별 lazy import로 불필요한 의존성 방지)
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(fileName) as 'pdf' | 'docx' | 'txt';

    let extractedText: string;
    if (fileType === 'txt') {
      extractedText = extractFromTxt(buffer);
    } else if (fileType === 'pdf') {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      extractedText = await extractFromPdf(buffer, { pdfParse: pdfParse as (buf: Buffer) => Promise<{ text: string }> });
    } else {
      const mammoth = await import('mammoth');
      extractedText = await extractFromDocx(buffer, { mammoth });
    }

    // 텍스트 길이 제한
    if (extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    }

    return Response.json({
      success: true,
      data: {
        fileName,
        fileType,
        fileSize,
        extractedText,
        extractedTextLength: extractedText.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.';
    return Response.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
