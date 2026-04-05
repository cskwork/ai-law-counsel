/**
 * 로컬 도구 스키마 정의
 * - MCP에서 가져오지 않는 로컬 전용 도구
 * - 법률 도구는 korean-law-mcp 서버에서 동적으로 로드
 */
import type { ToolDefinition } from '@/lib/zai/types';

/** 사용자에게 추가 질문하는 로컬 도구 */
export const CLARIFY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'clarify_situation',
    description: '사용자에게 추가 질문. 법률 상담에 필요한 세부 정보를 확인합니다.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: '사용자에게 확인할 질문 내용',
        },
      },
      required: ['question'],
    },
  },
};
