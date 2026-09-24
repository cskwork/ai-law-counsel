import type { SearchParams } from '@/lib/law/client';
import { createLawApiClient } from '@/lib/law/client';
import { getLawArticles, normalizeArticleList } from '@/lib/law/get-law-detail';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import { searchAdminRule } from '@/lib/law/search-admin-rule';
import { searchLawWithFallback } from '@/lib/law/search-law';
import { searchLawArticles } from '@/lib/law/search-law-articles';
import { searchPrecedentWithFallback } from '@/lib/law/search-precedent';
import type { ToolDefinition } from '@/lib/zai/types';

/** 판례 전문 최대 길이 (LLM 컨텍스트 보호) */
const MAX_PRECEDENT_TEXT_LENGTH = 3_000;

/** 판례 검색 기본 결과 수 (API 기본값 20은 컨텍스트만 늘린다) */
const DEFAULT_PRECEDENT_DISPLAY = 8;

export const LAW_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_law_articles',
      description:
        '상황이나 주제를 자연어로 넣으면 관련 법령 조문을 본문과 함께 찾아줍니다(국가법령정보센터 지능형 검색). 어떤 법령·조문이 적용되는지 모를 때 가장 먼저 사용하세요. 예: "부당해고 구제신청", "전세보증금 반환", "임금체불 신고".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '상황·주제를 담은 짧은 자연어 (예: "부당해고 구제신청 기간")',
          },
          display: {
            type: 'number',
            description: '결과 수 (기본 10, 최대 20)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_law',
      description:
        '법령을 "이름"으로 검색해 법령 ID를 얻습니다. 예: "근로기준법", "주택임대차보호법". 주제어(예: "부당해고")로 조문을 찾을 때는 search_law_articles를 쓰세요.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '법령명 (예: "근로기준법")',
          },
          display: {
            type: 'number',
            description: '결과 수',
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
      description:
        '법령의 특정 조문 전문을 조회합니다. lawName(또는 lawId)과 articles(조문 번호 목록)를 함께 주세요. 예: {"lawName":"근로기준법","articles":["23","28"]}. articles를 비우면 조문 목차만 돌려줍니다.',
      parameters: {
        type: 'object',
        properties: {
          lawName: {
            type: 'string',
            description: '법령명 (예: "근로기준법")',
          },
          lawId: {
            type: 'string',
            description: '법령 ID (search_law 결과의 lawId). lawName 대신 사용 가능',
          },
          articles: {
            type: 'array',
            items: { type: 'string' },
            description: '조회할 조문 번호 목록, 최대 6개 (예: ["23", "28", "43의2"])',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_precedent',
      description:
        '판례를 검색합니다. 짧은 핵심어 1~2개가 가장 잘 찾아집니다(예: "부당해고", "임대차보증금", "임금체불"). 사건명에서 먼저 찾고, 없으면 판결 본문에서 찾습니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '판례 핵심어 (예: "부당해고")',
          },
          display: {
            type: 'number',
            description: '결과 수 (기본 8)',
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
      description: '판례의 판시사항, 판결요지, 참조조문, 판결문 일부를 조회합니다.',
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
      description: '행정규칙(훈령, 예규, 고시 등)을 이름 키워드로 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 행정규칙 키워드',
          },
          display: {
            type: 'number',
            description: '결과 수',
          },
        },
        required: ['query'],
      },
    },
  },
];

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSearchParams(args: Record<string, unknown>, defaults: { display?: number; maxDisplay?: number } = {}): SearchParams {
  const display = toOptionalNumber(args.display) ?? defaults.display;
  return {
    query: String(args.query ?? ''),
    page: toOptionalNumber(args.page),
    display: display !== undefined && defaults.maxDisplay !== undefined
      ? Math.min(display, defaults.maxDisplay)
      : display,
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…(이하 생략)` : text;
}

export async function executeLawToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = createLawApiClient();

  switch (name) {
    case 'search_law_articles':
      return JSON.stringify(await searchLawArticles(client, toSearchParams(args, { display: 10, maxDisplay: 20 })));
    case 'search_law':
      return JSON.stringify(await searchLawWithFallback(client, toSearchParams(args)));
    case 'get_law_detail':
      return JSON.stringify(await getLawArticles(client, {
        lawId: args.lawId === undefined || args.lawId === null ? undefined : String(args.lawId),
        lawName: typeof args.lawName === 'string' ? args.lawName : undefined,
        articles: normalizeArticleList(args.articles ?? args.article),
      }));
    case 'search_precedent':
      return JSON.stringify(await searchPrecedentWithFallback(
        client,
        toSearchParams(args, { display: DEFAULT_PRECEDENT_DISPLAY, maxDisplay: 20 }),
      ));
    case 'get_precedent_detail': {
      const detail = await getPrecedentDetail(client, String(args.precedentId ?? ''));
      return JSON.stringify({ ...detail, fullText: truncate(detail.fullText, MAX_PRECEDENT_TEXT_LENGTH) });
    }
    case 'search_administrative_rule':
      return JSON.stringify(await searchAdminRule(client, toSearchParams(args)));
    default:
      throw new Error(`지원하지 않는 도구: ${name}`);
  }
}
