/**
 * MCP 도구 <-> LLM 도구 포맷 변환 브릿지
 * - MCP Tool 스키마를 OpenAI function calling 포맷으로 변환
 * - LLM 도구 호출 결과를 MCP callTool 결과에서 추출
 */
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition } from '@/lib/zai/types';

/** MCP Tool -> OpenAI ToolDefinition 변환 */
export function mcpToolToLlmTool(mcpTool: Tool): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description ?? '',
      parameters: (mcpTool.inputSchema as Record<string, unknown>) ?? {
        type: 'object',
        properties: {},
      },
    },
  };
}

/** MCP Tool 배열 -> LLM ToolDefinition 배열 변환 */
export function mcpToolsToLlmTools(mcpTools: readonly Tool[]): ToolDefinition[] {
  return mcpTools.map(mcpToolToLlmTool);
}

/** MCP CallToolResult -> 문자열 변환 (LLM 메시지용) */
export function extractToolResultText(result: CallToolResult): string {
  if (!result.content || result.content.length === 0) {
    return result.isError ? '도구 실행 오류' : '결과 없음';
  }

  const textParts = result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text);

  if (textParts.length === 0) {
    return '결과 없음 (텍스트 외 형식)';
  }

  return textParts.join('\n');
}
