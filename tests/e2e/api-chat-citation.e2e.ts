import { test, expect } from '@playwright/test';

test.describe('POST /api/chat - validation', () => {
  test('빈 요청 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('messages가 배열이 아니면 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: 'not-an-array' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('배열');
  });

  test('빈 messages 배열 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: [] },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('비어있습니다');
  });

  test('role/content 누락 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: [{ role: 'user' }] },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('role과 content');
  });

  test('메시지 길이 초과 시 400 에러를 반환해야 한다', async ({ request }) => {
    const longMessage = 'a'.repeat(2001);
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: longMessage }],
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('2000');
  });

  test('documentContext의 extractedText가 50,000자 초과 시 400 에러를 반환해야 한다', async ({ request }) => {
    const longText = 'a'.repeat(50_001);
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: '분석해주세요' }],
        documentContext: {
          fileName: 'test.pdf',
          fileType: 'pdf',
          fileSize: 1000,
          extractedText: longText,
          extractedTextLength: longText.length,
        },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('50,000');
  });

  test('documentContext에 잘못된 fileType 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: '분석해주세요' }],
        documentContext: {
          fileName: 'test.xlsx',
          fileType: 'xlsx',
          fileSize: 1000,
          extractedText: '내용',
          extractedTextLength: 2,
        },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('지원하지 않는 파일 형식');
  });

  test('유효한 메시지로 요청 시 서버가 크래시하지 않아야 한다', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {
        messages: [{ role: 'user', content: '안녕하세요' }],
      },
    });

    // MCP/LLM 연결 실패 시 400 (MCP 로드 실패) 또는 200 (SSE 스트림 시작) 또는 500 (서버 오류)
    // 핵심: 서버가 크래시 없이 응답해야 함
    expect([200, 400, 500]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/event-stream');
    }
  });
});

test.describe('GET /api/citation - validation', () => {
  test('type 파라미터 누락 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation?id=test');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('필수 파라미터');
  });

  test('id 파라미터 누락 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation?type=statute');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('필수 파라미터');
  });

  test('type과 id 모두 누락 시 400 에러를 반환해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('유효한 파라미터로 요청 시 MCP 의존 응답을 반환해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation?type=statute&id=민법&article=750');

    // MCP 서버 미연결 시 503, 연결 시 200
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    if (response.status() === 200) {
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('statute');
      expect(body.data.externalUrl).toContain('law.go.kr');
    } else {
      expect(body.success).toBe(false);
      expect(body.error).toContain('국가법령정보센터');
    }
  });

  test('판례 타입 요청 시 적절히 응답해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation?type=precedent&id=2023다12345');

    expect([200, 503]).toContain(response.status());
    const body = await response.json();

    if (response.status() === 503) {
      expect(body.error).toContain('국가법령정보센터');
    }
  });

  test('rule 타입 요청 시 적절히 응답해야 한다', async ({ request }) => {
    const response = await request.get('/api/citation?type=rule&id=행정규칙명');

    // rule 타입은 MCP 호출 없이 빈 fullText 반환
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.type).toBe('rule');
    expect(body.data.externalUrl).toContain('law.go.kr');
  });
});
