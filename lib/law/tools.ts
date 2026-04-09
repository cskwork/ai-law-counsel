import type { SearchParams } from '@/lib/law/client';
import { createLawApiClient } from '@/lib/law/client';
import { getLawDetail } from '@/lib/law/get-law-detail';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import { searchAdminRule } from '@/lib/law/search-admin-rule';
import { searchLaw } from '@/lib/law/search-law';
import { searchPrecedent } from '@/lib/law/search-precedent';
import type { ToolDefinition } from '@/lib/zai/types';

export const LAW_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_law',
      description: '한국 법령을 키워드로 검색합니다. 법률, 시행령, 시행규칙 등을 찾을 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 법령 키워드 (예: "주택임대차보호법", "근로기준법")',
          },
          page: {
            type: 'number',
            description: '페이지 번호 (기본값: 1)',
          },
          display: {
            type: 'number',
            description: '페이지당 결과 수',
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
      description: '특정 법령의 조문 상세 내용을 조회합니다. search_law 결과의 lawId를 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          lawId: {
            type: 'string',
            description: '법령 ID (search_law 결과의 lawId)',
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
      description: '한국 법원 판례를 키워드로 검색합니다. 대법원, 고등법원 등의 판례를 찾을 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 판례 키워드 (예: "보증금 반환", "해고 부당")',
          },
          page: {
            type: 'number',
            description: '페이지 번호 (기본값: 1)',
          },
          display: {
            type: 'number',
            description: '페이지당 결과 수',
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
      description: '특정 판례의 상세 내용(판시사항, 판결요지, 판례내용)을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          precedentId: {
            type: 'string',
            description: '판례 일련번호 (search_precedent 결과의 precedentId)',
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
      description: '행정규칙(훈령, 예규, 고시 등)을 키워드로 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 행정규칙 키워드',
          },
          page: {
            type: 'number',
            description: '페이지 번호 (기본값: 1)',
          },
          display: {
            type: 'number',
            description: '페이지당 결과 수',
          },
        },
        required: ['query'],
      },
    },
  },
];

function toSearchParams(args: Record<string, unknown>): SearchParams {
  return {
    query: String(args.query ?? ''),
    page: typeof args.page === 'number' ? args.page : Number.isFinite(Number(args.page)) ? Number(args.page) : undefined,
    display: typeof args.display === 'number' ? args.display : Number.isFinite(Number(args.display)) ? Number(args.display) : undefined,
  };
}

export async function executeLawToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = createLawApiClient();

  switch (name) {
    case 'search_law':
      return JSON.stringify(await searchLaw(client, toSearchParams(args)));
    case 'get_law_detail':
      return JSON.stringify(await getLawDetail(client, String(args.lawId ?? '')));
    case 'search_precedent':
      return JSON.stringify(await searchPrecedent(client, toSearchParams(args)));
    case 'get_precedent_detail':
      return JSON.stringify(await getPrecedentDetail(client, String(args.precedentId ?? '')));
    case 'search_administrative_rule':
      return JSON.stringify(await searchAdminRule(client, toSearchParams(args)));
    default:
      throw new Error(`지원하지 않는 도구: ${name}`);
  }
}
