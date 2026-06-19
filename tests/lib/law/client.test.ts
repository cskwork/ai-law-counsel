import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LawApiClient } from '@/lib/law/client';

describe('LawApiClient', () => {
  const API_KEY = 'test-api-key';
  let client: LawApiClient;

  beforeEach(() => {
    client = new LawApiClient(API_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildSearchUrl', () => {
    it('법령 검색 URL을 올바르게 생성해야 한다', () => {
      const url = client.buildSearchUrl('law', { query: '민법' });

      expect(url).toContain('lawSearch.do');
      expect(url).toContain('OC=test-api-key');
      expect(url).toContain('target=law');
      expect(url).toContain('type=XML');
      expect(url).toContain('query=%EB%AF%BC%EB%B2%95');
    });

    it('판례 검색 URL을 올바르게 생성해야 한다', () => {
      const url = client.buildSearchUrl('prec', { query: '손해배상', page: 2, display: 10 });

      expect(url).toContain('target=prec');
      expect(url).toContain('page=2');
      expect(url).toContain('display=10');
    });

    it('행정규칙 검색 URL을 올바르게 생성해야 한다', () => {
      const url = client.buildSearchUrl('admrul', { query: '규칙' });

      expect(url).toContain('target=admrul');
    });

    it('page와 display 기본값을 생략해야 한다', () => {
      const url = client.buildSearchUrl('law', { query: '민법' });

      expect(url).not.toContain('page=');
      expect(url).not.toContain('display=');
    });
  });

  describe('buildDetailUrl', () => {
    it('법령 상세 URL에 ID 파라미터를 사용해야 한다', () => {
      const url = client.buildDetailUrl('law', '123456');

      expect(url).toContain('lawService.do');
      expect(url).toContain('ID=123456');
      expect(url).toContain('OC=test-api-key');
      expect(url).toContain('type=XML');
    });

    it('조문 번호가 있으면 JO 파라미터를 포함해야 한다', () => {
      const url = client.buildDetailUrl('law', '123456', { articleJo: '000800' });

      expect(url).toContain('ID=123456');
      expect(url).toContain('JO=000800');
    });

    it('판례 상세 URL에 ID 파라미터를 사용해야 한다', () => {
      const url = client.buildDetailUrl('prec', '789012');

      expect(url).toContain('lawService.do');
      expect(url).toContain('ID=789012');
      expect(url).toContain('OC=test-api-key');
    });
  });

  describe('parseXml', () => {
    it('XML 문자열을 올바르게 파싱해야 한다', () => {
      const xml = '<root><name>테스트</name><count>5</count></root>';
      const result = client.parseXml(xml);

      expect(result).toEqual({
        root: {
          name: '테스트',
          count: 5,
        },
      });
    });

    it('빈 XML 요소를 처리해야 한다', () => {
      const xml = '<root><empty></empty></root>';
      const result = client.parseXml(xml);

      expect(result).toHaveProperty('root');
    });
  });

  describe('fetchAndParse', () => {
    it('네트워크 오류 시 에러를 던져야 한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      await expect(client.fetchAndParse('https://example.com')).rejects.toThrow(
        'Network error'
      );
    });

    it('응답이 OK가 아닌 경우 에러를 던져야 한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      await expect(client.fetchAndParse('https://example.com')).rejects.toThrow();
    });

    it('정상 응답을 파싱하여 반환해야 한다', async () => {
      const xmlResponse = '<root><item>test</item></root>';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(xmlResponse),
        })
      );

      const result = await client.fetchAndParse('https://example.com');

      expect(result).toEqual({
        root: {
          item: 'test',
        },
      });
    });
  });

  describe('fetchAndParse 재시도 정책', () => {
    it('4xx 응답은 재시도하지 않고 즉시 throw해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.fetchAndParse('https://example.com')).rejects.toThrow('404');
      // 단 1회만 호출되어야 함(재시도 금지)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('5xx 응답은 최대 2회까지 재시도해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.fetchAndParse('https://example.com')).rejects.toThrow('503');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('네트워크 오류는 재시도하고, 두 번째 시도가 성공하면 결과를 반환해야 한다', async () => {
      const xmlResponse = '<root><item>ok</item></root>';
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(xmlResponse),
        });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.fetchAndParse('https://example.com');

      expect(result).toEqual({ root: { item: 'ok' } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('AbortError(타임아웃)는 재시도 대상이어야 한다', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const fetchMock = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.fetchAndParse('https://example.com')).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
