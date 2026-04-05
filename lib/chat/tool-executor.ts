/**
 * 도구 실행기
 * - LLM 도구 호출을 MCP 서버로 포워딩
 * - clarify_situation은 로컬 처리 (MCP 도구 아님)
 */
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { extractToolResultText } from '@/lib/mcp/tool-bridge';

/** 도구 실행에 필요한 의존성 인터페이스 */
export interface ToolExecutorDeps {
  callMcpTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
}

/**
 * 도구 호출 실행
 * - MCP 도구는 서버로 포워딩
 * - clarify_situation은 로컬 처리
 */
export async function executeToolCall(
  toolName: string,
  argsJson: string,
  deps: ToolExecutorDeps,
): Promise<string> {
  // JSON 파싱
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return `도구 인자 JSON 파싱 오류: ${argsJson}`;
  }

  // clarify_situation은 로컬 처리
  if (toolName === 'clarify_situation') {
    return `[추가 질문] ${args.question as string}`;
  }

  // MCP 서버로 포워딩
  try {
    const result = await deps.callMcpTool(toolName, args);

    if (result.isError) {
      return `도구 실행 오류 (${toolName}): ${extractToolResultText(result)}`;
    }

    return extractToolResultText(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `도구 실행 오류 (${toolName}): ${message}`;
  }
}
