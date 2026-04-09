/**
 * 도구 실행기 테스트
 * - 도구 호출 포워딩 검증
 * - clarify_situation: 로컬 처리 검증
 * - 잘못된 JSON: 에러 메시지 반환 검증
 * - 도구 호출 실패 시 에러 메시지 반환 검증
 */
import { describe, it, expect, vi } from 'vitest';
import { executeToolCall, type ToolExecutorDeps } from '@/lib/chat/tool-executor';

/** 테스트용 모의 의존성 생성 */
function createMockDeps(): ToolExecutorDeps {
  return {
    callTool: vi.fn().mockResolvedValue('{"totalCount":1,"items":[]}'),
  };
}

describe('executeToolCall', () => {
  describe('도구 포워딩', () => {
    it('search_law 호출을 실행 함수로 포워딩한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '민법', page: 2 });

      const result = await executeToolCall('search_law', args, deps);

      expect(deps.callTool).toHaveBeenCalledWith('search_law', { query: '민법', page: 2 });
      expect(result).toBe('{"totalCount":1,"items":[]}');
    });

    it('임의의 도구 이름도 포워딩한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '조세' });

      await executeToolCall('search_tax_tribunal', args, deps);

      expect(deps.callTool).toHaveBeenCalledWith('search_tax_tribunal', { query: '조세' });
    });
  });

  describe('clarify_situation', () => {
    it('로컬에서 질문 텍스트를 반환한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ question: '사건 발생 시기가 언제인가요?' });

      const result = await executeToolCall('clarify_situation', args, deps);

      expect(result).toBe('[추가 질문] 사건 발생 시기가 언제인가요?');
      expect(deps.callTool).not.toHaveBeenCalled();
    });
  });

  describe('잘못된 JSON', () => {
    it('파싱 실패 시 에러 메시지를 반환한다', async () => {
      const deps = createMockDeps();

      const result = await executeToolCall('search_law', '{invalid json}', deps);

      expect(result).toContain('도구 인자 JSON 파싱 오류');
    });
  });

  describe('도구 호출 실패', () => {
    it('실행 오류 시 도구 실행 오류 메시지를 반환한다', async () => {
      const deps = createMockDeps();
      vi.mocked(deps.callTool).mockRejectedValue(new Error('법률 API 호출 실패'));
      const args = JSON.stringify({ query: '민법' });

      const result = await executeToolCall('search_law', args, deps);

      expect(result).toBe('도구 실행 오류 (search_law): 법률 API 호출 실패');
    });
  });
});
