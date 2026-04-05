/**
 * Z.ai 클라이언트 테스트
 * - completeChat: 올바른 요청 본문 전송 검증
 * - completeChatWithTools: 도구 포함 요청 검증
 * - 401 에러 시 한국어 메시지 검증
 * - 429 에러 시 한국어 메시지 검증
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ZaiClient, createZaiClient } from '@/lib/zai/client';
import type { ChatMessage, ToolDefinition, ZaiResponse } from '@/lib/zai/types';

const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const TEST_API_KEY = 'test-api-key-12345';

/** 성공 응답 모킹 헬퍼 */
function mockFetchSuccess(data: ZaiResponse): void {
  vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** 에러 응답 모킹 헬퍼 */
function mockFetchError(status: number, statusText: string): void {
  vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response('error', { status, statusText }),
  );
}

/** 테스트용 더미 응답 */
const dummyResponse: ZaiResponse = {
  id: 'chatcmpl-test-123',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: '테스트 응답입니다.',
        tool_calls: undefined,
      },
      finish_reason: 'stop',
    },
  ],
};

describe('ZaiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('completeChat', () => {
    it('올바른 요청 본문을 전송해야 한다 (model=glm-5-turbo, stream=false)', async () => {
      mockFetchSuccess(dummyResponse);

      const client = new ZaiClient(TEST_API_KEY);
      const messages: ChatMessage[] = [
        { role: 'system', content: '법률 상담 어시스턴트입니다.' },
        { role: 'user', content: '임대차 보호법에 대해 알려주세요.' },
      ];

      const result = await client.completeChat(messages);

      // fetch 호출 검증
      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe(API_URL);

      // 요청 헤더 검증
      const headers = options?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
      expect(headers['Content-Type']).toBe('application/json');

      // 요청 본문 검증
      const body = JSON.parse(options?.body as string);
      expect(body.model).toBe('glm-5-turbo');
      expect(body.stream).toBe(false);
      expect(body.messages).toEqual(messages);
      expect(body.tools).toBeUndefined();
      expect(body.tool_choice).toBeUndefined();

      // 응답 검증
      expect(result).toEqual(dummyResponse);
    });
  });

  describe('completeChatWithTools', () => {
    it('도구 정의를 포함한 요청을 전송해야 한다', async () => {
      mockFetchSuccess(dummyResponse);

      const client = new ZaiClient(TEST_API_KEY);
      const messages: ChatMessage[] = [
        { role: 'user', content: '관련 법령을 검색해주세요.' },
      ];
      const tools: ToolDefinition[] = [
        {
          type: 'function',
          function: {
            name: 'search_law',
            description: '법령 검색',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: '검색어' },
              },
              required: ['query'],
            },
          },
        },
      ];

      await client.completeChatWithTools(messages, tools);

      expect(global.fetch).toHaveBeenCalledOnce();
      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.tools).toEqual(tools);
      expect(body.tool_choice).toBe('auto');
      expect(body.stream).toBe(false);
      expect(body.model).toBe('glm-5-turbo');
    });
  });

  describe('에러 처리', () => {
    it('401 에러 시 한국어 인증 실패 메시지를 던져야 한다', async () => {
      mockFetchError(401, 'Unauthorized');

      const client = new ZaiClient(TEST_API_KEY);
      const messages: ChatMessage[] = [
        { role: 'user', content: '테스트' },
      ];

      await expect(client.completeChat(messages)).rejects.toThrow(
        'Z.ai API 인증 실패. ZAI_API_KEY를 확인하세요.',
      );
    });

    it('429 에러 시 한국어 한도 초과 메시지를 던져야 한다', async () => {
      mockFetchError(429, 'Too Many Requests');

      const client = new ZaiClient(TEST_API_KEY);
      const messages: ChatMessage[] = [
        { role: 'user', content: '테스트' },
      ];

      await expect(client.completeChat(messages)).rejects.toThrow(
        'Z.ai API 요청 한도 초과. 잠시 후 다시 시도하세요.',
      );
    });

    it('기타 에러 시 상태 코드와 상태 텍스트를 포함한 메시지를 던져야 한다', async () => {
      mockFetchError(500, 'Internal Server Error');

      const client = new ZaiClient(TEST_API_KEY);
      const messages: ChatMessage[] = [
        { role: 'user', content: '테스트' },
      ];

      await expect(client.completeChat(messages)).rejects.toThrow(
        'Z.ai API 오류: 500 Internal Server Error',
      );
    });
  });

  describe('createZaiClient', () => {
    it('ZAI_API_KEY 환경 변수가 없으면 에러를 던져야 한다', () => {
      const original = process.env.ZAI_API_KEY;
      delete process.env.ZAI_API_KEY;

      expect(() => createZaiClient()).toThrow('ZAI_API_KEY');

      // 복원
      if (original !== undefined) {
        process.env.ZAI_API_KEY = original;
      }
    });

    it('ZAI_API_KEY 환경 변수가 있으면 ZaiClient 인스턴스를 반환해야 한다', () => {
      process.env.ZAI_API_KEY = 'env-test-key';

      const client = createZaiClient();
      expect(client).toBeInstanceOf(ZaiClient);

      delete process.env.ZAI_API_KEY;
    });
  });
});
