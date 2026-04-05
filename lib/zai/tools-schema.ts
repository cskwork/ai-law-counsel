/**
 * 법률 상담 챗봇 도구 스키마 정의
 * - 국가법령정보센터 API 연동 도구 6종
 */
import type { ToolDefinition } from '@/lib/zai/types';

/** 법률 상담 도구 목록 */
export const LAW_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_law',
      description: '한국 법령 키워드 검색. 검색어를 기반으로 관련 법령 목록을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 법령 키워드',
          },
          page: {
            type: 'number',
            description: '페이지 번호 (기본값: 1)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_law_detail',
      description: '특정 법령 조문 상세 조회. 법령 ID로 조문 내용을 가져옵니다.',
      parameters: {
        type: 'object',
        properties: {
          lawId: {
            type: 'string',
            description: '법령 고유 식별자',
          },
        },
        required: ['lawId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_precedent',
      description: '한국 법원 판례 키워드 검색. 검색어를 기반으로 관련 판례 목록을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 판례 키워드',
          },
          court: {
            type: 'string',
            description: '법원명 필터 (예: 대법원, 헌법재판소)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_precedent_detail',
      description: '특정 판례 상세 조회. 판례 ID로 판결 전문을 가져옵니다.',
      parameters: {
        type: 'object',
        properties: {
          precedentId: {
            type: 'string',
            description: '판례 고유 식별자',
          },
        },
        required: ['precedentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_administrative_rule',
      description: '행정규칙 키워드 검색. 검색어를 기반으로 관련 행정규칙 목록을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 행정규칙 키워드',
          },
        },
        required: ['query'],
      },
    },
  },
  {
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
  },
];
