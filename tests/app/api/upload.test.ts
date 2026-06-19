import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/document/validator', () => ({
  validateFile: vi.fn(),
}));

// 입출력 추출 함수만 stub하고, 순수 헬퍼(applyTextLimit)는 실제 구현 보존
vi.mock('@/lib/document/extractor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/document/extractor')>();
  return {
    ...actual,
    extractFromTxt: vi.fn().mockReturnValue('txt content'),
    extractFromPdf: vi.fn().mockResolvedValue('pdf content'),
    extractFromDocx: vi.fn().mockResolvedValue('docx content'),
  };
});

// pdf-parse / mammoth dynamic import mocks
vi.mock('pdf-parse', () => ({ default: vi.fn() }));
vi.mock('mammoth', () => ({ extractRawText: vi.fn() }));

import { validateFile } from '@/lib/document/validator';
import { extractFromTxt, extractFromPdf, extractFromDocx } from '@/lib/document/extractor';

const importRoute = () => import('@/app/api/upload/route');

/** File instanceof 체크를 우회한 mock Request */
function mockRequestWithFile(file: { name: string; size: number; content?: string }) {
  const buffer = new TextEncoder().encode(file.content ?? 'fake').buffer;
  const fileObj = Object.create(File.prototype, {
    name: { value: file.name },
    size: { value: file.size },
    arrayBuffer: { value: () => Promise.resolve(buffer) },
  });

  const mockFormData = { get: vi.fn().mockReturnValue(fileObj) };
  return {
    formData: () => Promise.resolve(mockFormData),
  } as unknown as Request;
}

function mockRequestNoFile() {
  const mockFormData = { get: vi.fn().mockReturnValue(null) };
  return {
    formData: () => Promise.resolve(mockFormData),
  } as unknown as Request;
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 PDF 업로드 시 200 응답을 반환해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: true });
    vi.mocked(extractFromPdf).mockResolvedValue('제1조 (목적) 본 계약은...');

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'contract.pdf', size: 1000 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.fileName).toBe('contract.pdf');
    expect(body.data.fileType).toBe('pdf');
    expect(body.data.extractedText).toBe('제1조 (목적) 본 계약은...');
  });

  it('DOCX 업로드 시 200 응답을 반환해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: true });
    vi.mocked(extractFromDocx).mockResolvedValue('근로계약서 내용');

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'employment.docx', size: 2000 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.fileType).toBe('docx');
  });

  it('미지원 파일 형식 시 400 응답을 반환해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: false, error: '지원하지 않는 파일 형식입니다.' });

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'image.png', size: 500 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('지원하지 않는');
  });

  it('크기 초과 시 413 응답을 반환해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: false, error: '파일 크기가 4.5MB를 초과합니다.' });

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'large.pdf', size: 5_000_000 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.success).toBe(false);
    expect(body.error).toContain('4.5MB');
  });

  it('파일이 없으면 400 응답을 반환해야 한다', async () => {
    const { POST } = await importRoute();
    const request = mockRequestNoFile();
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('파일이 첨부되지 않았습니다');
  });

  it('TXT 파일 업로드 시 extractFromTxt를 호출해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: true });
    vi.mocked(extractFromTxt).mockReturnValue('텍스트 내용');

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'memo.txt', size: 100, content: '텍스트 내용' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.fileType).toBe('txt');
    expect(extractFromTxt).toHaveBeenCalled();
  });

  it('짧은 문서는 truncated=false와 원본 길이를 반환해야 한다', async () => {
    vi.mocked(validateFile).mockReturnValue({ valid: true });
    vi.mocked(extractFromPdf).mockResolvedValue('제1조 (목적) 본 계약은...');

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'contract.pdf', size: 1000 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.truncated).toBe(false);
    expect(body.data.originalTextLength).toBe('제1조 (목적) 본 계약은...'.length);
    expect(body.data.extractedText).toBe('제1조 (목적) 본 계약은...');
  });

  it('50,000자를 초과한 문서는 truncated=true와 원본 길이를 반환해야 한다', async () => {
    const longText = '가'.repeat(60_000);
    vi.mocked(validateFile).mockReturnValue({ valid: true });
    vi.mocked(extractFromPdf).mockResolvedValue(longText);

    const { POST } = await importRoute();
    const request = mockRequestWithFile({ name: 'long.pdf', size: 4_000_000 });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.truncated).toBe(true);
    expect(body.data.originalTextLength).toBe(60_000);
    expect(body.data.extractedTextLength).toBe(50_000);
    expect(body.data.extractedText.length).toBe(50_000);
  });
});
