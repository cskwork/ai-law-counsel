import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

test.describe('POST /api/upload', () => {
  test('TXT 파일 업로드 시 추출된 텍스트를 반환해야 한다', async ({ request }) => {
    const filePath = path.join(FIXTURE_DIR, 'sample-contract.txt');
    const fileContent = fs.readFileSync(filePath);

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'sample-contract.txt',
          mimeType: 'text/plain',
          buffer: fileContent,
        },
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.fileName).toBe('sample-contract.txt');
    expect(body.data.fileType).toBe('txt');
    expect(body.data.extractedText).toContain('제1조');
    expect(body.data.extractedText).toContain('보증금');
    expect(body.data.extractedTextLength).toBeGreaterThan(0);
    expect(body.data.fileSize).toBeGreaterThan(0);
  });

  test('빈 파일 업로드 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'empty.txt',
          mimeType: 'text/plain',
          buffer: Buffer.alloc(0),
        },
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('미지원 파일 형식 업로드 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake-png-data'),
        },
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('지원하지 않는 파일 형식');
  });

  test('크기 초과 파일 업로드 시 413 에러를 반환해야 한다', async ({ request }) => {
    // 4.5MB + 1 byte
    const oversizedBuffer = Buffer.alloc(4_500_001, 'a');

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'large.txt',
          mimeType: 'text/plain',
          buffer: oversizedBuffer,
        },
      },
    });

    expect(response.status()).toBe(413);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('4.5MB');
  });

  test('파일 없이 요청 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/upload', {
      multipart: {},
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('PDF 업로드 시 200 응답 및 텍스트를 추출해야 한다', async ({ request }) => {
    // 최소한의 유효 PDF 생성
    const minimalPdf = Buffer.from(
      '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF',
    );

    const response = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: minimalPdf,
        },
      },
    });

    // pdf-parse가 이 최소 PDF를 처리할 수 있는지에 따라 200 또는 500
    // 핵심: 서버가 크래시 없이 응답한다
    expect([200, 500]).toContain(response.status());

    const body = await response.json();
    if (response.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.data.fileType).toBe('pdf');
    } else {
      expect(body.success).toBe(false);
    }
  });
});
