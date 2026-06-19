/** 문서 텍스트 추출기 (DI 패턴) */

/** pdf-parse 의존성 인터페이스 */
export interface PdfParseFunc {
  (buffer: Buffer): Promise<{ text: string }>;
}

/** mammoth 의존성 인터페이스 */
export interface MammothDep {
  extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
}

/** 추출기 의존성 */
export interface ExtractorDeps {
  pdfParse: PdfParseFunc;
  mammoth: MammothDep;
}

/** PDF 버퍼에서 텍스트 추출 */
export async function extractFromPdf(
  buffer: Buffer,
  deps: Pick<ExtractorDeps, 'pdfParse'>,
): Promise<string> {
  try {
    const result = await deps.pdfParse(buffer);
    return result.text;
  } catch {
    throw new Error('PDF 텍스트 추출에 실패했습니다');
  }
}

/** DOCX 버퍼에서 텍스트 추출 */
export async function extractFromDocx(
  buffer: Buffer,
  deps: Pick<ExtractorDeps, 'mammoth'>,
): Promise<string> {
  try {
    const result = await deps.mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    throw new Error('DOCX 텍스트 추출에 실패했습니다');
  }
}

/** TXT 버퍼에서 텍스트 읽기 */
export function extractFromTxt(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/** 대형 텍스트를 LLM 컨텍스트에 맞게 청킹 (섹션 기준 분할) */
export function chunkText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // "제N조" 패턴으로 섹션 분할 시도
  const sections = text.split(/(?=제\d+조)/);
  let result = '';

  for (const section of sections) {
    if (result.length + section.length > maxLength) break;
    result += section;
  }

  // 섹션 분할로도 부족하면 단순 절단
  if (!result) {
    return text.slice(0, maxLength);
  }

  return result;
}

/** 파일 형식에 따라 적절한 추출기로 텍스트 추출 */
export async function extractText(
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt',
  deps: ExtractorDeps,
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractFromPdf(buffer, deps);
    case 'docx':
      return extractFromDocx(buffer, deps);
    case 'txt':
      return extractFromTxt(buffer);
    default:
      throw new Error(`지원하지 않는 파일 형식: ${fileType}`);
  }
}

/** 추출 결과 메타데이터 (절단 여부 포함) */
export interface ExtractedTextMeta {
  /** 길이 제한 적용 후 텍스트 */
  readonly text: string;
  /** 원본이 maxLength를 초과해 절단되었는지 여부 */
  readonly truncated: boolean;
  /** 절단 전 원본 텍스트 길이 */
  readonly originalLength: number;
  /** 실제 사용된(반환된) 텍스트 길이 */
  readonly usedLength: number;
}

/**
 * rawText에 maxLength를 적용해 절단 메타데이터를 산출 (순수 함수)
 * 절단 규칙을 한 곳에서 관리 -- extractTextWithMeta와 upload 라우트가 공유
 */
export function applyTextLimit(rawText: string, maxLength: number): ExtractedTextMeta {
  const originalLength = rawText.length;
  const text = originalLength > maxLength ? rawText.slice(0, maxLength) : rawText;
  const usedLength = text.length;

  return {
    text,
    truncated: originalLength > usedLength,
    originalLength,
    usedLength,
  };
}

/**
 * 텍스트를 추출하고 maxLength 적용 결과를 메타데이터와 함께 반환
 * 원본 길이가 사용 길이보다 크면 truncated=true
 */
export async function extractTextWithMeta(
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt',
  deps: ExtractorDeps,
  maxLength: number,
): Promise<ExtractedTextMeta> {
  const full = await extractText(buffer, fileType, deps);
  return applyTextLimit(full, maxLength);
}
