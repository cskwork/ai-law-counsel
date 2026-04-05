/**
 * MCP 도구 브릿지 테스트
 * - MCP Tool -> LLM ToolDefinition 변환 검증
 * - MCP CallToolResult -> 문자열 변환 검증
 */
import { describe, it, expect } from 'vitest';
import {
  mcpToolToLlmTool,
  mcpToolsToLlmTools,
  extractToolResultText,
} from '@/lib/mcp/tool-bridge';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('mcpToolToLlmTool', () => {
  it('MCP Tool을 OpenAI function calling 포맷으로 변환한다', () => {
    const mcpTool: Tool = {
      name: 'search_law',
      description: '법령 검색',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색어' },
        },
        required: ['query'],
      },
    };

    const result = mcpToolToLlmTool(mcpTool);

    expect(result).toEqual({
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
    });
  });

  it('description이 없으면 빈 문자열로 대체한다', () => {
    const mcpTool: Tool = {
      name: 'some_tool',
      inputSchema: { type: 'object', properties: {} },
    };

    const result = mcpToolToLlmTool(mcpTool);

    expect(result.function.description).toBe('');
  });
});

describe('mcpToolsToLlmTools', () => {
  it('MCP Tool 배열을 LLM ToolDefinition 배열로 변환한다', () => {
    const mcpTools: Tool[] = [
      { name: 'tool_a', description: 'A', inputSchema: { type: 'object', properties: {} } },
      { name: 'tool_b', description: 'B', inputSchema: { type: 'object', properties: {} } },
    ];

    const result = mcpToolsToLlmTools(mcpTools);

    expect(result).toHaveLength(2);
    expect(result[0].function.name).toBe('tool_a');
    expect(result[1].function.name).toBe('tool_b');
  });
});

describe('extractToolResultText', () => {
  it('text content를 추출한다', () => {
    const result: CallToolResult = {
      content: [{ type: 'text', text: '{"totalCount":5}' }],
    };

    expect(extractToolResultText(result)).toBe('{"totalCount":5}');
  });

  it('여러 text content를 줄바꿈으로 합친다', () => {
    const result: CallToolResult = {
      content: [
        { type: 'text', text: '첫번째' },
        { type: 'text', text: '두번째' },
      ],
    };

    expect(extractToolResultText(result)).toBe('첫번째\n두번째');
  });

  it('content가 비어있으면 "결과 없음"을 반환한다', () => {
    const result: CallToolResult = { content: [] };

    expect(extractToolResultText(result)).toBe('결과 없음');
  });

  it('isError가 true이고 content가 비어있으면 에러 메시지를 반환한다', () => {
    const result: CallToolResult = { content: [], isError: true };

    expect(extractToolResultText(result)).toBe('도구 실행 오류');
  });

  it('text가 아닌 content만 있으면 안내 메시지를 반환한다', () => {
    const result: CallToolResult = {
      content: [{ type: 'image', data: 'base64data', mimeType: 'image/png' }],
    };

    expect(extractToolResultText(result)).toBe('결과 없음 (텍스트 외 형식)');
  });
});
