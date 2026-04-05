/**
 * 도구 실행기 테스트 (MCP 기반)
 * - MCP 도구 호출 포워딩 검증
 * - clarify_situation: 로컬 처리 검증
 * - MCP 에러 결과 처리 검증
 * - 잘못된 JSON: 에러 메시지 반환 검증
 * - MCP 호출 실패 시 에러 메시지 반환 검증
 */
import { describe, it, expect, vi } from 'vitest';
import { executeToolCall, type ToolExecutorDeps } from '@/lib/chat/tool-executor';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** MCP 성공 응답 생성 헬퍼 */
function mcpSuccess(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

/** MCP 에러 응답 생성 헬퍼 */
function mcpError(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/** 테스트용 모의 의존성 생성 */
function createMockDeps(): ToolExecutorDeps {
  return {
    callMcpTool: vi.fn().mockResolvedValue(mcpSuccess('{"totalCount":1,"items":[]}')),
  };
}

describe('executeToolCall', () => {
  describe('MCP 도구 포워딩', () => {
    it('search_law 호출을 MCP 서버로 포워딩한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '민법', page: 2 });

      const result = await executeToolCall('search_law', args, deps);

      expect(deps.callMcpTool).toHaveBeenCalledWith('search_law', { query: '민법', page: 2 });
      expect(result).toBe('{"totalCount":1,"items":[]}');
    });

    it('임의의 MCP 도구 이름도 포워딩한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ query: '조세' });

      await executeToolCall('search_tax_tribunal', args, deps);

      expect(deps.callMcpTool).toHaveBeenCalledWith('search_tax_tribunal', { query: '조세' });
    });
  });

  describe('MCP 에러 응답', () => {
    it('isError가 true이면 에러 메시지를 반환한다', async () => {
      const deps = createMockDeps();
      vi.mocked(deps.callMcpTool).mockResolvedValue(mcpError('도구를 찾을 수 없습니다'));
      const args = JSON.stringify({ query: '민법' });

      const result = await executeToolCall('search_law', args, deps);

      expect(result).toContain('도구 실행 오류 (search_law)');
      expect(result).toContain('도구를 찾을 수 없습니다');
    });
  });

  describe('clarify_situation', () => {
    it('MCP가 아닌 로컬에서 질문 텍스트를 반환한다', async () => {
      const deps = createMockDeps();
      const args = JSON.stringify({ question: '사건 발생 시기가 언제인가요?' });

      const result = await executeToolCall('clarify_situation', args, deps);

      expect(result).toBe('[추가 질문] 사건 발생 시기가 언제인가요?');
      expect(deps.callMcpTool).not.toHaveBeenCalled();
    });
  });

  describe('잘못된 JSON', () => {
    it('파싱 실패 시 에러 메시지를 반환한다', async () => {
      const deps = createMockDeps();

      const result = await executeToolCall('search_law', '{invalid json}', deps);

      expect(result).toContain('도구 인자 JSON 파싱 오류');
    });
  });

  describe('MCP 호출 실패', () => {
    it('네트워크 오류 시 도구 실행 오류 메시지를 반환한다', async () => {
      const deps = createMockDeps();
      vi.mocked(deps.callMcpTool).mockRejectedValue(new Error('MCP 서버 연결 실패'));
      const args = JSON.stringify({ query: '민법' });

      const result = await executeToolCall('search_law', args, deps);

      expect(result).toBe('도구 실행 오류 (search_law): MCP 서버 연결 실패');
    });
  });
});
