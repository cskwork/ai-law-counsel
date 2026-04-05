/**
 * 도구 실행기 테스트
 * - 각 도구 이름별 올바른 디스패치 검증
 * - clarify_situation: 질문 텍스트 반환 검증
 * - 알 수 없는 도구: 에러 메시지 반환 검증
 * - 잘못된 JSON: 에러 메시지 반환 검증
 * - API 호출 실패 시 에러 메시지 반환 검증
 */
import { describe, it, expect, vi } from 'vitest';
import { executeToolCall, type ToolExecutorDeps } from '@/lib/chat/tool-executor';

/** 테스트용 모의 의존성 생성 */
function createMockDeps(): ToolExecutorDeps {
  return {
    searchLaw: vi.fn().mockResolvedValue({ totalCount: 1, items: [{ lawId: 'L001' }] }),
    getLawDetail: vi.fn().mockResolvedValue({ lawId: 'L001', lawNameKo: '민법' }),
    searchPrecedent: vi.fn().mockResolvedValue({ totalCount: 1, items: [{ precedentId: 'P001' }] }),
    getPrecedentDetail: vi.fn().mockResolvedValue({ precedentId: 'P001', caseName: '판례' }),
    searchAdminRule: vi.fn().mockResolvedValue({ totalCount: 0, items: [] }),
  };
}

describe('executeToolCall', () => {
  describe('search_law', () => {
    it('query와 page를 포함하여 searchLaw를 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '민법', page: 2 });

      const result = await executeToolCall('search_law', args, deps);

      expect(deps.searchLaw).toHaveBeenCalledWith({ query: '민법', page: 2 });
      expect(result).toBe(JSON.stringify({ totalCount: 1, items: [{ lawId: 'L001' }] }, null, 2));
    });

    it('page 없이 query만으로 searchLaw를 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '형법' });

      await executeToolCall('search_law', args, deps);

      expect(deps.searchLaw).toHaveBeenCalledWith({ query: '형법' });
    });
  });

  describe('get_law_detail', () => {
    it('lawId로 getLawDetail을 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ lawId: 'L001' });

      const result = await executeToolCall('get_law_detail', args, deps);

      expect(deps.getLawDetail).toHaveBeenCalledWith('L001');
      expect(result).toBe(JSON.stringify({ lawId: 'L001', lawNameKo: '민법' }, null, 2));
    });
  });

  describe('search_precedent', () => {
    it('query로 searchPrecedent를 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '손해배상' });

      const result = await executeToolCall('search_precedent', args, deps);

      expect(deps.searchPrecedent).toHaveBeenCalledWith({ query: '손해배상' });
      expect(result).toBe(
        JSON.stringify({ totalCount: 1, items: [{ precedentId: 'P001' }] }, null, 2),
      );
    });
  });

  describe('get_precedent_detail', () => {
    it('precedentId로 getPrecedentDetail을 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ precedentId: 'P001' });

      const result = await executeToolCall('get_precedent_detail', args, deps);

      expect(deps.getPrecedentDetail).toHaveBeenCalledWith('P001');
      expect(result).toBe(JSON.stringify({ precedentId: 'P001', caseName: '판례' }, null, 2));
    });
  });

  describe('search_administrative_rule', () => {
    it('query로 searchAdminRule을 호출해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '행정규칙' });

      const result = await executeToolCall('search_administrative_rule', args, deps);

      expect(deps.searchAdminRule).toHaveBeenCalledWith({ query: '행정규칙' });
      expect(result).toBe(JSON.stringify({ totalCount: 0, items: [] }, null, 2));
    });
  });

  describe('clarify_situation', () => {
    it('질문 텍스트를 포함한 메시지를 반환해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ question: '사건 발생 시기가 언제인가요?' });

      const result = await executeToolCall('clarify_situation', args, deps);

      expect(result).toBe('[추가 질문] 사건 발생 시기가 언제인가요?');
    });
  });

  describe('알 수 없는 도구', () => {
    it('알 수 없는 도구 이름 에러 메시지를 반환해야 한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: 'test' });

      const result = await executeToolCall('unknown_tool', args, deps);

      expect(result).toBe('알 수 없는 도구: unknown_tool');
    });
  });

  describe('잘못된 JSON', () => {
    it('파싱 실패 시 에러 메시지를 반환해야 한다', async () => {
      const deps = createMockDeps();

      const result = await executeToolCall('search_law', '{invalid json}', deps);

      expect(result).toContain('도구 인자 JSON 파싱 오류');
    });
  });

  describe('API 호출 실패', () => {
    it('의존성 함수 에러 시 도구 실행 오류 메시지를 반환해야 한다', async () => {
      const deps = createMockDeps();
      vi.mocked(deps.searchLaw).mockRejectedValue(new Error('API 타임아웃'));
      const args = JSON.stringify({ query: '민법' });

      const result = await executeToolCall('search_law', args, deps);

      expect(result).toBe('도구 실행 오류 (search_law): API 타임아웃');
    });
  });
});
