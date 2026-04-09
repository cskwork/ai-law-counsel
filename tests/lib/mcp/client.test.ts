/**
 * MCP 클라이언트 세션 관리 테스트
 * - 세션 종료 (terminateSession + close)
 * - 세션 오류 시 자동 재연결
 * - HMR 캐시 유지 (globalThis)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTerminateSession = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockListTools = vi.fn().mockResolvedValue({ tools: [{ name: 'test_tool' }] });
const mockCallTool = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

let mockOnclose: (() => void) | null = null;

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  class MockClient {
    connect = mockConnect;
    close = mockClose;
    listTools = mockListTools;
    callTool = mockCallTool;
    onerror: ((error: Error) => void) | null = null;

    private _onclose: (() => void) | null = null;
    get onclose() { return this._onclose; }
    set onclose(fn: (() => void) | null) {
      this._onclose = fn;
      mockOnclose = fn;
    }
  }
  return { Client: MockClient };
});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  class MockTransport {
    terminateSession = mockTerminateSession;
  }
  return { StreamableHTTPClientTransport: MockTransport };
});

// 환경변수 설정
vi.stubEnv('LAW_API_KEY', 'test-key');

describe('MCP 클라이언트 세션 관리', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOnclose = null;
    // 각 테스트 전 모듈 캐시 초기화
    const { resetMcpClient } = await import('@/lib/mcp/client');
    await resetMcpClient();
    vi.clearAllMocks(); // resetMcpClient 호출로 인한 mock 카운트 초기화
  });

  describe('resetMcpClient', () => {
    it('terminateSession()과 close()를 호출한다', async () => {
      const { listMcpTools, resetMcpClient } = await import('@/lib/mcp/client');

      // 클라이언트 연결 트리거
      await listMcpTools();

      await resetMcpClient();

      expect(mockTerminateSession).toHaveBeenCalledOnce();
      expect(mockClose).toHaveBeenCalledOnce();
    });

    it('terminateSession() 실패 시에도 close()를 호출한다', async () => {
      const { listMcpTools, resetMcpClient } = await import('@/lib/mcp/client');

      await listMcpTools();

      mockTerminateSession.mockRejectedValueOnce(new Error('network error'));

      await resetMcpClient();

      expect(mockTerminateSession).toHaveBeenCalledOnce();
      expect(mockClose).toHaveBeenCalledOnce();
    });

    it('캐시된 클라이언트가 없으면 아무 것도 호출하지 않는다', async () => {
      const { resetMcpClient } = await import('@/lib/mcp/client');

      await resetMcpClient();

      expect(mockTerminateSession).not.toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('세션 오류 시 자동 재연결', () => {
    it('callMcpTool에서 세션 오류 발생 시 재연결 후 재시도한다', async () => {
      const { callMcpTool } = await import('@/lib/mcp/client');

      // 첫 호출: 세션 오류, 두 번째: 성공
      mockCallTool
        .mockRejectedValueOnce(Object.assign(new Error('session expired'), { code: -32000 }))
        .mockResolvedValueOnce({ content: [{ type: 'text', text: 'retry-ok' }] });

      const result = await callMcpTool('test', {});

      expect(result.content[0]).toEqual({ type: 'text', text: 'retry-ok' });
      // terminateSession은 재연결 과정에서 호출됨
      expect(mockTerminateSession).toHaveBeenCalled();
    });

    it('listMcpTools에서 세션 오류 발생 시 재연결 후 재시도한다', async () => {
      const { listMcpTools } = await import('@/lib/mcp/client');

      mockListTools
        .mockRejectedValueOnce(new Error('Connection closed'))
        .mockResolvedValueOnce({ tools: [{ name: 'recovered_tool' }] });

      const tools = await listMcpTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('recovered_tool');
    });

    it('세션 오류가 아닌 경우 재시도하지 않고 throw한다', async () => {
      const { callMcpTool } = await import('@/lib/mcp/client');

      mockCallTool.mockRejectedValueOnce(new Error('invalid arguments'));

      await expect(callMcpTool('test', {})).rejects.toThrow('invalid arguments');
    });
  });

  describe('onclose 핸들러', () => {
    it('연결 종료 시 캐시를 초기화하여 다음 요청에서 재연결한다', async () => {
      const { listMcpTools } = await import('@/lib/mcp/client');

      await listMcpTools();
      expect(mockConnect).toHaveBeenCalledOnce();

      // onclose 시뮬레이션
      mockOnclose?.();

      // 다음 호출 시 새 연결 생성
      mockListTools.mockResolvedValueOnce({ tools: [{ name: 'new_tool' }] });
      const tools = await listMcpTools();

      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(tools[0].name).toBe('new_tool');
    });
  });

  describe('싱글톤 캐시', () => {
    it('두 번째 호출에서 캐시된 클라이언트를 재사용한다', async () => {
      const { listMcpTools } = await import('@/lib/mcp/client');

      await listMcpTools();
      await listMcpTools();

      // connect는 한 번만 호출
      expect(mockConnect).toHaveBeenCalledOnce();
    });
  });
});
