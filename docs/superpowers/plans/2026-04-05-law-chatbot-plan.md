# 한국 법률 상담 챗봇 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 국가법령정보센터 API + Z.ai GLM-4.7 기반 한국 법률 상담 웹 챗봇 구현

**Architecture:** Next.js 14 App Router로 프론트엔드와 백엔드를 단일 프로젝트로 구성. API Route Handler에서 Z.ai function calling 루프를 실행하여 법령/판례/행정규칙을 검색하고, SSE 스트리밍으로 클라이언트에 답변을 전달한다.

**Tech Stack:** Next.js 14, React 18, TypeScript 5, Tailwind CSS 3, fast-xml-parser, Vitest, Vercel

**Spec:** `docs/superpowers/specs/2026-04-05-law-chatbot-design.md`

---

## 파일 구조

```
ai-law-counsel/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── page.tsx                      # 메인 채팅 페이지
│   ├── globals.css                   # Tailwind + 커스텀 스타일
│   ├── api/
│   │   └── chat/
│   │       └── route.ts              # POST /api/chat (SSE 스트리밍)
│   └── components/
│       ├── chat/
│       │   ├── ChatContainer.tsx     # 채팅 전체 래퍼 + 상태 관리
│       │   ├── MessageList.tsx       # 메시지 목록 (자동 스크롤)
│       │   ├── MessageBubble.tsx     # 개별 메시지 (마크다운 렌더링)
│       │   ├── ChatInput.tsx         # 입력창 + 전송 버튼
│       │   └── ToolCallIndicator.tsx # "법령 검색 중..." 표시
│       ├── law/
│       │   ├── LawArticleCard.tsx    # 법령 조문 카드
│       │   └── PrecedentCard.tsx     # 판례 카드
│       └── common/
│           ├── Disclaimer.tsx        # 면책 고지 배너
│           └── LoadingDots.tsx       # 타이핑 인디케이터
├── lib/
│   ├── zai/
│   │   ├── client.ts                # Z.ai API 클라이언트
│   │   ├── types.ts                 # Z.ai 타입 정의
│   │   └── tools-schema.ts          # function calling 도구 JSON Schema
│   ├── law/
│   │   ├── client.ts                # 국가법령정보센터 HTTP 클라이언트
│   │   ├── types.ts                 # 법령/판례/행정규칙 타입
│   │   ├── search-law.ts            # 법령 검색
│   │   ├── get-law-detail.ts        # 법령 상세 조회
│   │   ├── search-precedent.ts      # 판례 검색
│   │   ├── get-precedent-detail.ts  # 판례 상세 조회
│   │   └── search-admin-rule.ts     # 행정규칙 검색
│   ├── chat/
│   │   ├── orchestrator.ts          # function calling 루프
│   │   ├── tool-executor.ts         # 도구명 -> 실행 함수 매핑
│   │   └── system-prompt.ts         # 시스템 프롬프트
│   └── utils/
│       └── sse.ts                   # SSE 인코딩 유틸
├── tests/
│   ├── lib/
│   │   ├── law/
│   │   │   ├── client.test.ts
│   │   │   ├── search-law.test.ts
│   │   │   ├── get-law-detail.test.ts
│   │   │   ├── search-precedent.test.ts
│   │   │   ├── get-precedent-detail.test.ts
│   │   │   └── search-admin-rule.test.ts
│   │   ├── zai/
│   │   │   └── client.test.ts
│   │   └── chat/
│   │       ├── orchestrator.test.ts
│   │       └── tool-executor.test.ts
│   └── setup.ts
├── .env.example
├── .env.local                       # (gitignored)
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.env.example`, `.gitignore`, `tests/setup.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/danny/Documents/PARA/Resource/ai-law-counsel
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

`--src-dir=false`는 `app/`을 루트에 배치. 이미 존재하는 `README.md`는 덮어쓸 것인지 물으면 Yes.

Expected: `app/`, `public/`, `package.json`, `tsconfig.json` 등 생성됨.

- [ ] **Step 2: 추가 의존성 설치**

```bash
npm install fast-xml-parser react-markdown remark-gfm
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Vitest 설정 파일 생성**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

`tests/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: 환경 변수 예제 파일 생성**

`.env.example`:
```bash
# Z.ai GLM-4.7 API 키 (https://api.z.ai에서 발급)
ZAI_API_KEY=your_zai_api_key_here

# 국가법령정보센터 API 키 (https://open.law.go.kr에서 발급)
LAW_API_KEY=your_law_api_key_here
```

- [ ] **Step 5: .gitignore에 .env.local 확인**

Next.js의 기본 `.gitignore`에 `.env*.local`이 포함되어 있는지 확인. 없으면 추가.

- [ ] **Step 6: package.json에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 7: 빌드 및 테스트 환경 확인**

```bash
npm run build
npm run test:run
```

Expected: 빌드 성공, 테스트 0개 (아직 테스트 파일 없음).

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore: Next.js 14 프로젝트 스캐폴딩

Tailwind CSS, Vitest, fast-xml-parser, react-markdown 설정 포함"
```

---

## Task 2: 법률 API 타입 정의

**Files:**
- Create: `lib/law/types.ts`
- Test: `tests/lib/law/types.test.ts` (타입 가드 테스트)

- [ ] **Step 1: 테스트 작성**

`tests/lib/law/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  type LawSearchResult,
  type LawDetail,
  type PrecedentSearchResult,
  type PrecedentDetail,
  type AdminRuleSearchResult,
  isLawSearchResult,
} from '@/lib/law/types';

describe('law types', () => {
  it('isLawSearchResult validates correct shape', () => {
    const valid: LawSearchResult = {
      totalCount: 1,
      items: [
        {
          lawId: '123',
          lawNameKo: '주택임대차보호법',
          lawAbbreviation: '주임법',
          lawType: '법률',
          department: '법무부',
          promulgationDate: '20230101',
          promulgationNumber: '19000',
          enforcementDate: '20230701',
          amendmentType: '일부개정',
        },
      ],
    };
    expect(isLawSearchResult(valid)).toBe(true);
  });

  it('isLawSearchResult rejects invalid shape', () => {
    expect(isLawSearchResult(null)).toBe(false);
    expect(isLawSearchResult({ items: 'not array' })).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/law/types.test.ts
```

Expected: FAIL - `Cannot find module '@/lib/law/types'`

- [ ] **Step 3: 타입 정의 구현**

`lib/law/types.ts`:
```typescript
// 법령 검색 결과 항목
export interface LawSearchItem {
  lawId: string;
  lawNameKo: string;
  lawAbbreviation: string;
  lawType: string;        // 법률, 시행령, 시행규칙 등
  department: string;     // 소관부처
  promulgationDate: string;
  promulgationNumber: string;
  enforcementDate: string;
  amendmentType: string;  // 제정, 일부개정, 전부개정 등
}

export interface LawSearchResult {
  totalCount: number;
  items: LawSearchItem[];
}

// 법령 상세 (조문 포함)
export interface LawArticle {
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

export interface LawDetail {
  lawId: string;
  lawNameKo: string;
  lawType: string;
  department: string;
  promulgationDate: string;
  enforcementDate: string;
  articles: LawArticle[];
}

// 판례 검색 결과 항목
export interface PrecedentSearchItem {
  precedentId: string;
  caseName: string;
  caseNumber: string;
  judgmentDate: string;
  judgment: string;       // 선고
  courtName: string;
  caseType: string;
  holding: string;        // 판시사항
  summary: string;        // 판결요지
}

export interface PrecedentSearchResult {
  totalCount: number;
  items: PrecedentSearchItem[];
}

// 판례 상세
export interface PrecedentDetail {
  precedentId: string;
  caseName: string;
  caseNumber: string;
  judgmentDate: string;
  judgment: string;
  courtName: string;
  caseType: string;
  holding: string;
  summary: string;
  referenceArticles: string;
  referencePrecedents: string;
  fullText: string;
}

// 행정규칙 검색 결과 항목
export interface AdminRuleSearchItem {
  adminRuleId: string;
  adminRuleName: string;
  department: string;
  establishDate: string;
  enforcementDate: string;
}

export interface AdminRuleSearchResult {
  totalCount: number;
  items: AdminRuleSearchItem[];
}

// 타입 가드
export function isLawSearchResult(value: unknown): value is LawSearchResult {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.totalCount === 'number' && Array.isArray(obj.items);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/types.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/law/types.ts tests/lib/law/types.test.ts
git commit -m "feat: 국가법령정보센터 API 타입 정의

법령/판례/행정규칙 검색 및 상세 조회 타입 포함"
```

---

## Task 3: 국가법령정보센터 API 기본 클라이언트

**Files:**
- Create: `lib/law/client.ts`
- Test: `tests/lib/law/client.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/law/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LawApiClient } from '@/lib/law/client';

describe('LawApiClient', () => {
  let client: LawApiClient;

  beforeEach(() => {
    client = new LawApiClient('test-api-key');
  });

  it('buildSearchUrl constructs correct URL for law search', () => {
    const url = client.buildSearchUrl('law', { query: '임대차', page: 1, display: 10 });
    expect(url).toBe(
      'https://www.law.go.kr/DRF/lawSearch.do?OC=test-api-key&target=law&type=XML&query=%EC%9E%84%EB%8C%80%EC%B0%A8&page=1&display=10'
    );
  });

  it('buildSearchUrl constructs correct URL for precedent search', () => {
    const url = client.buildSearchUrl('prec', { query: '보증금' });
    expect(url).toContain('target=prec');
    expect(url).toContain('query=%EB%B3%B4%EC%A6%9D%EA%B8%88');
  });

  it('buildDetailUrl constructs correct URL for law detail', () => {
    const url = client.buildDetailUrl('law', '12345');
    expect(url).toBe(
      'https://www.law.go.kr/DRF/lawService.do?OC=test-api-key&target=law&type=XML&MST=12345'
    );
  });

  it('buildDetailUrl constructs correct URL for precedent detail', () => {
    const url = client.buildDetailUrl('prec', '67890');
    expect(url).toBe(
      'https://www.law.go.kr/DRF/lawService.do?OC=test-api-key&target=prec&type=XML&ID=67890'
    );
  });

  it('parseXml parses XML string to object', () => {
    const xml = '<root><name>test</name><count>5</count></root>';
    const result = client.parseXml(xml);
    expect(result.root.name).toBe('test');
    expect(result.root.count).toBe(5);
  });

  it('fetchAndParse throws on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    await expect(client.fetchAndParse('https://example.com')).rejects.toThrow('Network error');
    vi.restoreAllMocks();
  });

  it('fetchAndParse throws on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Error', { status: 500, statusText: 'Internal Server Error' })
    );
    await expect(client.fetchAndParse('https://example.com')).rejects.toThrow('API error: 500');
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/law/client.test.ts
```

Expected: FAIL

- [ ] **Step 3: 클라이언트 구현**

`lib/law/client.ts`:
```typescript
import { XMLParser } from 'fast-xml-parser';

const BASE_URL = 'https://www.law.go.kr/DRF';
const SEARCH_ENDPOINT = `${BASE_URL}/lawSearch.do`;
const DETAIL_ENDPOINT = `${BASE_URL}/lawService.do`;
const TIMEOUT_MS = 10_000;

export interface SearchParams {
  query: string;
  page?: number;
  display?: number;
}

type Target = 'law' | 'prec' | 'admrul';

export class LawApiClient {
  private readonly apiKey: string;
  private readonly parser: XMLParser;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });
  }

  buildSearchUrl(target: Target, params: SearchParams): string {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set('OC', this.apiKey);
    url.searchParams.set('target', target);
    url.searchParams.set('type', 'XML');
    url.searchParams.set('query', params.query);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.display !== undefined) url.searchParams.set('display', String(params.display));
    return url.toString();
  }

  buildDetailUrl(target: 'law' | 'prec', id: string): string {
    const url = new URL(DETAIL_ENDPOINT);
    url.searchParams.set('OC', this.apiKey);
    url.searchParams.set('target', target);
    url.searchParams.set('type', 'XML');
    // 법령은 MST, 판례는 ID 파라미터명 사용
    const idParam = target === 'law' ? 'MST' : 'ID';
    url.searchParams.set(idParam, id);
    return url.toString();
  }

  parseXml(xml: string): Record<string, unknown> {
    return this.parser.parse(xml) as Record<string, unknown>;
  }

  async fetchAndParse(url: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const xml = await response.text();
      return this.parseXml(xml);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// 환경 변수에서 싱글턴 생성
export function createLawApiClient(): LawApiClient {
  const apiKey = process.env.LAW_API_KEY;
  if (!apiKey) {
    throw new Error('LAW_API_KEY 환경 변수가 설정되지 않았습니다');
  }
  return new LawApiClient(apiKey);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/client.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/law/client.ts tests/lib/law/client.test.ts
git commit -m "feat: 국가법령정보센터 API 기본 클라이언트

XML 파싱, URL 빌더, 타임아웃 처리 포함"
```

---

## Task 4: 법령 검색 함수들

**Files:**
- Create: `lib/law/search-law.ts`, `lib/law/get-law-detail.ts`, `lib/law/search-precedent.ts`, `lib/law/get-precedent-detail.ts`, `lib/law/search-admin-rule.ts`
- Test: `tests/lib/law/search-law.test.ts`, `tests/lib/law/get-law-detail.test.ts`, `tests/lib/law/search-precedent.test.ts`, `tests/lib/law/get-precedent-detail.test.ts`, `tests/lib/law/search-admin-rule.test.ts`

### 4a: search-law

- [ ] **Step 1: 테스트 작성**

`tests/lib/law/search-law.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { searchLaw, parseLawSearchXml } from '@/lib/law/search-law';
import { LawApiClient } from '@/lib/law/client';

describe('parseLawSearchXml', () => {
  it('parses law search XML response correctly', () => {
    const parsed = {
      LawSearch: {
        totalCnt: 2,
        law: [
          {
            법령ID: '001',
            법령명한글: '주택임대차보호법',
            법령약칭명: '주임법',
            법령구분명: '법률',
            소관부처명: '법무부',
            공포일자: '20230101',
            공포번호: '19000',
            시행일자: '20230701',
            제개정구분명: '일부개정',
          },
          {
            법령ID: '002',
            법령명한글: '상가건물 임대차보호법',
            법령약칭명: '상임법',
            법령구분명: '법률',
            소관부처명: '법무부',
            공포일자: '20230201',
            공포번호: '19001',
            시행일자: '20230801',
            제개정구분명: '일부개정',
          },
        ],
      },
    };

    const result = parseLawSearchXml(parsed);
    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].lawId).toBe('001');
    expect(result.items[0].lawNameKo).toBe('주택임대차보호법');
    expect(result.items[1].lawId).toBe('002');
  });

  it('handles single result (not array)', () => {
    const parsed = {
      LawSearch: {
        totalCnt: 1,
        law: {
          법령ID: '001',
          법령명한글: '주택임대차보호법',
          법령약칭명: '',
          법령구분명: '법률',
          소관부처명: '법무부',
          공포일자: '20230101',
          공포번호: '19000',
          시행일자: '20230701',
          제개정구분명: '일부개정',
        },
      },
    };

    const result = parseLawSearchXml(parsed);
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('handles empty result', () => {
    const parsed = { LawSearch: { totalCnt: 0 } };
    const result = parseLawSearchXml(parsed);
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('searchLaw', () => {
  it('calls client and returns parsed result', async () => {
    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://example.com'),
      fetchAndParse: vi.fn().mockResolvedValue({
        LawSearch: {
          totalCnt: 1,
          law: {
            법령ID: '001',
            법령명한글: '테스트법',
            법령약칭명: '',
            법령구분명: '법률',
            소관부처명: '법무부',
            공포일자: '20230101',
            공포번호: '19000',
            시행일자: '20230701',
            제개정구분명: '제정',
          },
        },
      }),
    } as unknown as LawApiClient;

    const result = await searchLaw(mockClient, { query: '테스트' });
    expect(result.totalCount).toBe(1);
    expect(result.items[0].lawNameKo).toBe('테스트법');
    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('law', { query: '테스트' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/law/search-law.test.ts
```

Expected: FAIL

- [ ] **Step 3: 구현**

`lib/law/search-law.ts`:
```typescript
import type { LawApiClient, SearchParams } from './client';
import type { LawSearchResult, LawSearchItem } from './types';

interface RawLawItem {
  법령ID: string;
  법령명한글: string;
  법령약칭명: string;
  법령구분명: string;
  소관부처명: string;
  공포일자: string;
  공포번호: string;
  시행일자: string;
  제개정구분명: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapLawItem(raw: RawLawItem): LawSearchItem {
  return {
    lawId: String(raw.법령ID ?? ''),
    lawNameKo: String(raw.법령명한글 ?? ''),
    lawAbbreviation: String(raw.법령약칭명 ?? ''),
    lawType: String(raw.법령구분명 ?? ''),
    department: String(raw.소관부처명 ?? ''),
    promulgationDate: String(raw.공포일자 ?? ''),
    promulgationNumber: String(raw.공포번호 ?? ''),
    enforcementDate: String(raw.시행일자 ?? ''),
    amendmentType: String(raw.제개정구분명 ?? ''),
  };
}

export function parseLawSearchXml(parsed: Record<string, unknown>): LawSearchResult {
  const root = parsed.LawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, items: [] };

  const totalCount = Number(root.totalCnt ?? 0);
  const rawItems = toArray(root.law as RawLawItem | RawLawItem[] | undefined);

  return {
    totalCount,
    items: rawItems.map(mapLawItem),
  };
}

export async function searchLaw(
  client: LawApiClient,
  params: SearchParams,
): Promise<LawSearchResult> {
  const url = client.buildSearchUrl('law', params);
  const parsed = await client.fetchAndParse(url);
  return parseLawSearchXml(parsed);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/search-law.test.ts
```

Expected: PASS

### 4b: get-law-detail

- [ ] **Step 5: 테스트 작성**

`tests/lib/law/get-law-detail.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { getLawDetail, parseLawDetailXml } from '@/lib/law/get-law-detail';
import { LawApiClient } from '@/lib/law/client';

describe('parseLawDetailXml', () => {
  it('parses law detail with articles', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '주택임대차보호법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '20230101',
          시행일자: '20230701',
        },
        조문: {
          조문단위: [
            { 조문번호: '제1조', 조문제목: '목적', 조문내용: '이 법은 주거용 건물...' },
            { 조문번호: '제2조', 조문제목: '정의', 조문내용: '이 법에서 사용하는...' },
          ],
        },
      },
    };

    const result = parseLawDetailXml(parsed);
    expect(result.lawId).toBe('001');
    expect(result.lawNameKo).toBe('주택임대차보호법');
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].articleNumber).toBe('제1조');
    expect(result.articles[0].articleContent).toBe('이 법은 주거용 건물...');
  });

  it('handles single article (not array)', () => {
    const parsed = {
      법령: {
        기본정보: {
          법령ID: '001',
          법령명_한글: '테스트법',
          법령구분: '법률',
          소관부처: '법무부',
          공포일자: '20230101',
          시행일자: '20230701',
        },
        조문: {
          조문단위: { 조문번호: '제1조', 조문제목: '목적', 조문내용: '내용' },
        },
      },
    };

    const result = parseLawDetailXml(parsed);
    expect(result.articles).toHaveLength(1);
  });
});

describe('getLawDetail', () => {
  it('calls client and returns parsed result', async () => {
    const mockClient = {
      buildDetailUrl: vi.fn().mockReturnValue('https://example.com'),
      fetchAndParse: vi.fn().mockResolvedValue({
        법령: {
          기본정보: {
            법령ID: '001',
            법령명_한글: '테스트법',
            법령구분: '법률',
            소관부처: '법무부',
            공포일자: '20230101',
            시행일자: '20230701',
          },
          조문: { 조문단위: [] },
        },
      }),
    } as unknown as LawApiClient;

    const result = await getLawDetail(mockClient, '001');
    expect(result.lawId).toBe('001');
    expect(mockClient.buildDetailUrl).toHaveBeenCalledWith('law', '001');
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

```bash
npx vitest run tests/lib/law/get-law-detail.test.ts
```

Expected: FAIL

- [ ] **Step 7: 구현**

`lib/law/get-law-detail.ts`:
```typescript
import type { LawApiClient } from './client';
import type { LawDetail, LawArticle } from './types';

interface RawArticle {
  조문번호: string;
  조문제목: string;
  조문내용: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseLawDetailXml(parsed: Record<string, unknown>): LawDetail {
  const root = parsed['법령'] as Record<string, unknown> | undefined;
  const info = (root?.['기본정보'] ?? {}) as Record<string, unknown>;
  const articlesRoot = (root?.['조문'] ?? {}) as Record<string, unknown>;
  const rawArticles = toArray(articlesRoot['조문단위'] as RawArticle | RawArticle[] | undefined);

  const articles: LawArticle[] = rawArticles.map((raw) => ({
    articleNumber: String(raw.조문번호 ?? ''),
    articleTitle: String(raw.조문제목 ?? ''),
    articleContent: String(raw.조문내용 ?? ''),
  }));

  return {
    lawId: String(info['법령ID'] ?? ''),
    lawNameKo: String(info['법령명_한글'] ?? ''),
    lawType: String(info['법령구분'] ?? ''),
    department: String(info['소관부처'] ?? ''),
    promulgationDate: String(info['공포일자'] ?? ''),
    enforcementDate: String(info['시행일자'] ?? ''),
    articles,
  };
}

export async function getLawDetail(
  client: LawApiClient,
  lawId: string,
): Promise<LawDetail> {
  const url = client.buildDetailUrl('law', lawId);
  const parsed = await client.fetchAndParse(url);
  return parseLawDetailXml(parsed);
}
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/get-law-detail.test.ts
```

Expected: PASS

### 4c: search-precedent

- [ ] **Step 9: 테스트 작성**

`tests/lib/law/search-precedent.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { searchPrecedent, parsePrecedentSearchXml } from '@/lib/law/search-precedent';
import { LawApiClient } from '@/lib/law/client';

describe('parsePrecedentSearchXml', () => {
  it('parses precedent search XML response', () => {
    const parsed = {
      PrecSearch: {
        totalCnt: 1,
        prec: {
          판례일련번호: '100',
          사건명: '임대차보증금반환',
          사건번호: '2023다12345',
          선고일자: '20231215',
          선고: '선고',
          법원명: '대법원',
          사건종류명: '민사',
          판시사항: '임대차 보증금 반환 의무',
          판결요지: '임대인은 보증금을 반환할 의무가 있다',
        },
      },
    };

    const result = parsePrecedentSearchXml(parsed);
    expect(result.totalCount).toBe(1);
    expect(result.items[0].precedentId).toBe('100');
    expect(result.items[0].courtName).toBe('대법원');
  });

  it('handles empty result', () => {
    const parsed = { PrecSearch: { totalCnt: 0 } };
    const result = parsePrecedentSearchXml(parsed);
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('searchPrecedent', () => {
  it('calls client with prec target', async () => {
    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://example.com'),
      fetchAndParse: vi.fn().mockResolvedValue({
        PrecSearch: { totalCnt: 0 },
      }),
    } as unknown as LawApiClient;

    await searchPrecedent(mockClient, { query: '보증금' });
    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('prec', { query: '보증금' });
  });
});
```

- [ ] **Step 10: 테스트 실패 확인 후 구현**

`lib/law/search-precedent.ts`:
```typescript
import type { LawApiClient, SearchParams } from './client';
import type { PrecedentSearchResult, PrecedentSearchItem } from './types';

interface RawPrecedentItem {
  판례일련번호: string;
  사건명: string;
  사건번호: string;
  선고일자: string;
  선고: string;
  법원명: string;
  사건종류명: string;
  판시사항: string;
  판결요지: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapPrecedentItem(raw: RawPrecedentItem): PrecedentSearchItem {
  return {
    precedentId: String(raw.판례일련번호 ?? ''),
    caseName: String(raw.사건명 ?? ''),
    caseNumber: String(raw.사건번호 ?? ''),
    judgmentDate: String(raw.선고일자 ?? ''),
    judgment: String(raw.선고 ?? ''),
    courtName: String(raw.법원명 ?? ''),
    caseType: String(raw.사건종류명 ?? ''),
    holding: String(raw.판시사항 ?? ''),
    summary: String(raw.판결요지 ?? ''),
  };
}

export function parsePrecedentSearchXml(parsed: Record<string, unknown>): PrecedentSearchResult {
  const root = parsed.PrecSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, items: [] };

  const totalCount = Number(root.totalCnt ?? 0);
  const rawItems = toArray(root.prec as RawPrecedentItem | RawPrecedentItem[] | undefined);

  return {
    totalCount,
    items: rawItems.map(mapPrecedentItem),
  };
}

export async function searchPrecedent(
  client: LawApiClient,
  params: SearchParams,
): Promise<PrecedentSearchResult> {
  const url = client.buildSearchUrl('prec', params);
  const parsed = await client.fetchAndParse(url);
  return parsePrecedentSearchXml(parsed);
}
```

- [ ] **Step 11: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/search-precedent.test.ts
```

Expected: PASS

### 4d: get-precedent-detail

- [ ] **Step 12: 테스트 작성**

`tests/lib/law/get-precedent-detail.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { getPrecedentDetail, parsePrecedentDetailXml } from '@/lib/law/get-precedent-detail';
import { LawApiClient } from '@/lib/law/client';

describe('parsePrecedentDetailXml', () => {
  it('parses precedent detail XML response', () => {
    const parsed = {
      PrecService: {
        판례정보일련번호: '100',
        사건명: '임대차보증금반환',
        사건번호: '2023다12345',
        선고일자: '20231215',
        선고: '선고',
        법원명: '대법원',
        사건종류명: '민사',
        판시사항: '판시사항 내용',
        판결요지: '판결요지 내용',
        참조조문: '주택임대차보호법 제3조',
        참조판례: '',
        판례내용: '판례 전문 내용...',
      },
    };

    const result = parsePrecedentDetailXml(parsed);
    expect(result.precedentId).toBe('100');
    expect(result.fullText).toBe('판례 전문 내용...');
    expect(result.referenceArticles).toBe('주택임대차보호법 제3조');
  });
});

describe('getPrecedentDetail', () => {
  it('calls client with prec target and ID', async () => {
    const mockClient = {
      buildDetailUrl: vi.fn().mockReturnValue('https://example.com'),
      fetchAndParse: vi.fn().mockResolvedValue({
        PrecService: {
          판례정보일련번호: '100',
          사건명: '', 사건번호: '', 선고일자: '', 선고: '',
          법원명: '', 사건종류명: '', 판시사항: '', 판결요지: '',
          참조조문: '', 참조판례: '', 판례내용: '',
        },
      }),
    } as unknown as LawApiClient;

    await getPrecedentDetail(mockClient, '100');
    expect(mockClient.buildDetailUrl).toHaveBeenCalledWith('prec', '100');
  });
});
```

- [ ] **Step 13: 구현**

`lib/law/get-precedent-detail.ts`:
```typescript
import type { LawApiClient } from './client';
import type { PrecedentDetail } from './types';

export function parsePrecedentDetailXml(parsed: Record<string, unknown>): PrecedentDetail {
  const root = (parsed.PrecService ?? {}) as Record<string, unknown>;

  return {
    precedentId: String(root['판례정보일련번호'] ?? ''),
    caseName: String(root['사건명'] ?? ''),
    caseNumber: String(root['사건번호'] ?? ''),
    judgmentDate: String(root['선고일자'] ?? ''),
    judgment: String(root['선고'] ?? ''),
    courtName: String(root['법원명'] ?? ''),
    caseType: String(root['사건종류명'] ?? ''),
    holding: String(root['판시사항'] ?? ''),
    summary: String(root['판결요지'] ?? ''),
    referenceArticles: String(root['참조조문'] ?? ''),
    referencePrecedents: String(root['참조판례'] ?? ''),
    fullText: String(root['판례내용'] ?? ''),
  };
}

export async function getPrecedentDetail(
  client: LawApiClient,
  precedentId: string,
): Promise<PrecedentDetail> {
  const url = client.buildDetailUrl('prec', precedentId);
  const parsed = await client.fetchAndParse(url);
  return parsePrecedentDetailXml(parsed);
}
```

- [ ] **Step 14: 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/get-precedent-detail.test.ts
```

Expected: PASS

### 4e: search-admin-rule

- [ ] **Step 15: 테스트 작성**

`tests/lib/law/search-admin-rule.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { searchAdminRule, parseAdminRuleSearchXml } from '@/lib/law/search-admin-rule';
import { LawApiClient } from '@/lib/law/client';

describe('parseAdminRuleSearchXml', () => {
  it('parses admin rule search XML response', () => {
    const parsed = {
      AdmRulSearch: {
        totalCnt: 1,
        admrul: {
          행정규칙ID: '500',
          행정규칙명: '법률구조업무처리규정',
          소관부처명: '법무부',
          제정일자: '20200101',
          시행일자: '20200301',
        },
      },
    };

    const result = parseAdminRuleSearchXml(parsed);
    expect(result.totalCount).toBe(1);
    expect(result.items[0].adminRuleId).toBe('500');
    expect(result.items[0].adminRuleName).toBe('법률구조업무처리규정');
  });
});

describe('searchAdminRule', () => {
  it('calls client with admrul target', async () => {
    const mockClient = {
      buildSearchUrl: vi.fn().mockReturnValue('https://example.com'),
      fetchAndParse: vi.fn().mockResolvedValue({
        AdmRulSearch: { totalCnt: 0 },
      }),
    } as unknown as LawApiClient;

    await searchAdminRule(mockClient, { query: '법률구조' });
    expect(mockClient.buildSearchUrl).toHaveBeenCalledWith('admrul', { query: '법률구조' });
  });
});
```

- [ ] **Step 16: 구현**

`lib/law/search-admin-rule.ts`:
```typescript
import type { LawApiClient, SearchParams } from './client';
import type { AdminRuleSearchResult, AdminRuleSearchItem } from './types';

interface RawAdminRuleItem {
  행정규칙ID: string;
  행정규칙명: string;
  소관부처명: string;
  제정일자: string;
  시행일자: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapAdminRuleItem(raw: RawAdminRuleItem): AdminRuleSearchItem {
  return {
    adminRuleId: String(raw.행정규칙ID ?? ''),
    adminRuleName: String(raw.행정규칙명 ?? ''),
    department: String(raw.소관부처명 ?? ''),
    establishDate: String(raw.제정일자 ?? ''),
    enforcementDate: String(raw.시행일자 ?? ''),
  };
}

export function parseAdminRuleSearchXml(parsed: Record<string, unknown>): AdminRuleSearchResult {
  const root = parsed.AdmRulSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, items: [] };

  const totalCount = Number(root.totalCnt ?? 0);
  const rawItems = toArray(root.admrul as RawAdminRuleItem | RawAdminRuleItem[] | undefined);

  return {
    totalCount,
    items: rawItems.map(mapAdminRuleItem),
  };
}

export async function searchAdminRule(
  client: LawApiClient,
  params: SearchParams,
): Promise<AdminRuleSearchResult> {
  const url = client.buildSearchUrl('admrul', params);
  const parsed = await client.fetchAndParse(url);
  return parseAdminRuleSearchXml(parsed);
}
```

- [ ] **Step 17: 전체 법률 API 테스트 통과 확인**

```bash
npx vitest run tests/lib/law/
```

Expected: 모든 테스트 PASS

- [ ] **Step 18: 커밋**

```bash
git add lib/law/ tests/lib/law/
git commit -m "feat: 국가법령정보센터 API 검색 함수 5종 구현

법령/판례/행정규칙 검색 및 상세 조회. XML 파싱 포함."
```

---

## Task 5: Z.ai 타입 및 클라이언트

**Files:**
- Create: `lib/zai/types.ts`, `lib/zai/client.ts`
- Test: `tests/lib/zai/client.test.ts`

- [ ] **Step 1: Z.ai 타입 정의**

`lib/zai/types.ts`:
```typescript
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  tool_call_id?: string;
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolDefinition {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ZaiChoice {
  index: number;
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: ToolCall[];
  };
  message?: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string | null;
}

export interface ZaiResponse {
  id: string;
  choices: ZaiChoice[];
}

export interface ZaiRequestBody {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none';
}
```

- [ ] **Step 2: 테스트 작성**

`tests/lib/zai/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZaiClient } from '@/lib/zai/client';
import type { ChatMessage } from '@/lib/zai/types';

describe('ZaiClient', () => {
  let client: ZaiClient;

  beforeEach(() => {
    client = new ZaiClient('test-key');
  });

  it('completeChat sends correct request', async () => {
    const mockResponse: Record<string, unknown> = {
      id: 'chatcmpl-1',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello!', tool_calls: undefined },
          finish_reason: 'stop',
        },
      ],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hi' },
    ];

    const result = await client.completeChat(messages);
    expect(result.choices[0].message?.content).toBe('Hello!');

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(fetchCall[1]?.body as string);
    expect(body.model).toBe('glm-4.7');
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual(messages);

    vi.restoreAllMocks();
  });

  it('completeChatWithTools sends tools in request', async () => {
    const mockResponse = {
      id: 'chatcmpl-2',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'search_law', arguments: '{"query":"임대차"}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const messages: ChatMessage[] = [{ role: 'user', content: '임대차법 알려줘' }];
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'search_law',
          description: '법령 검색',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        },
      },
    ];

    const result = await client.completeChatWithTools(messages, tools);
    expect(result.choices[0].message?.tool_calls?.[0].function.name).toBe('search_law');

    vi.restoreAllMocks();
  });

  it('throws on 401 error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    await expect(client.completeChat([])).rejects.toThrow('Z.ai API 인증 실패');
    vi.restoreAllMocks();
  });

  it('throws on 429 error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Rate limited', { status: 429 })
    );

    await expect(client.completeChat([])).rejects.toThrow('Z.ai API 요청 한도 초과');
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run tests/lib/zai/client.test.ts
```

Expected: FAIL

- [ ] **Step 4: 클라이언트 구현**

`lib/zai/client.ts`:
```typescript
import type { ChatMessage, ToolDefinition, ZaiResponse, ZaiRequestBody } from './types';

const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = 'glm-4.7';

export class ZaiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async completeChat(messages: ChatMessage[]): Promise<ZaiResponse> {
    return this.request({ model: MODEL, messages, stream: false });
  }

  async completeChatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<ZaiResponse> {
    return this.request({
      model: MODEL,
      messages,
      stream: false,
      tools,
      tool_choice: 'auto',
    });
  }

  async streamChat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const body: ZaiRequestBody = {
      model: MODEL,
      messages,
      stream: true,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    this.checkResponseStatus(response);
    return response;
  }

  private async request(body: ZaiRequestBody): Promise<ZaiResponse> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    this.checkResponseStatus(response);
    return (await response.json()) as ZaiResponse;
  }

  private checkResponseStatus(response: Response): void {
    if (response.ok) return;

    if (response.status === 401) {
      throw new Error('Z.ai API 인증 실패. ZAI_API_KEY를 확인하세요.');
    }
    if (response.status === 429) {
      throw new Error('Z.ai API 요청 한도 초과. 잠시 후 다시 시도하세요.');
    }
    throw new Error(`Z.ai API 오류: ${response.status} ${response.statusText}`);
  }
}

export function createZaiClient(): ZaiClient {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error('ZAI_API_KEY 환경 변수가 설정되지 않았습니다');
  }
  return new ZaiClient(apiKey);
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run tests/lib/zai/client.test.ts
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add lib/zai/ tests/lib/zai/
git commit -m "feat: Z.ai GLM-4.7 API 클라이언트

function calling, 스트리밍, 에러 처리 지원"
```

---

## Task 6: 도구 스키마 및 실행기

**Files:**
- Create: `lib/zai/tools-schema.ts`, `lib/chat/tool-executor.ts`
- Test: `tests/lib/chat/tool-executor.test.ts`

- [ ] **Step 1: 도구 스키마 정의**

`lib/zai/tools-schema.ts`:
```typescript
import type { ToolDefinition } from './types';

export const LAW_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_law',
      description: '한국 법령을 키워드로 검색합니다. 법률, 시행령, 시행규칙 등을 찾을 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색할 법령 키워드 (예: "주택임대차보호법", "근로기준법")' },
          page: { type: 'number', description: '페이지 번호 (기본값: 1)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_law_detail',
      description: '특정 법령의 조문(조항) 상세 내용을 조회합니다. search_law로 찾은 법령ID를 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          lawId: { type: 'string', description: '법령 ID (search_law 결과의 lawId)' },
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
          query: { type: 'string', description: '검색할 판례 키워드 (예: "보증금 반환", "해고 부당")' },
          court: { type: 'string', description: '법원명 필터 (예: "대법원")' },
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
          precedentId: { type: 'string', description: '판례 일련번호 (search_precedent 결과의 precedentId)' },
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
          query: { type: 'string', description: '검색할 행정규칙 키워드' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clarify_situation',
      description: '사용자에게 추가 질문을 합니다. 법률 상담에 필요한 구체적 정보가 부족할 때 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '사용자에게 물어볼 질문' },
        },
        required: ['question'],
      },
    },
  },
];
```

- [ ] **Step 2: tool-executor 테스트 작성**

`tests/lib/chat/tool-executor.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeToolCall, type ToolExecutorDeps } from '@/lib/chat/tool-executor';

describe('executeToolCall', () => {
  const mockDeps: ToolExecutorDeps = {
    searchLaw: vi.fn().mockResolvedValue({ totalCount: 1, items: [{ lawId: '1', lawNameKo: '테스트법' }] }),
    getLawDetail: vi.fn().mockResolvedValue({ lawId: '1', lawNameKo: '테스트법', articles: [] }),
    searchPrecedent: vi.fn().mockResolvedValue({ totalCount: 0, items: [] }),
    getPrecedentDetail: vi.fn().mockResolvedValue({ precedentId: '1', caseName: '테스트' }),
    searchAdminRule: vi.fn().mockResolvedValue({ totalCount: 0, items: [] }),
  };

  it('executes search_law tool', async () => {
    const result = await executeToolCall('search_law', '{"query":"임대차"}', mockDeps);
    expect(mockDeps.searchLaw).toHaveBeenCalledWith({ query: '임대차' });
    expect(result).toContain('테스트법');
  });

  it('executes get_law_detail tool', async () => {
    const result = await executeToolCall('get_law_detail', '{"lawId":"1"}', mockDeps);
    expect(mockDeps.getLawDetail).toHaveBeenCalledWith('1');
    expect(typeof result).toBe('string');
  });

  it('executes search_precedent tool', async () => {
    const result = await executeToolCall('search_precedent', '{"query":"보증금"}', mockDeps);
    expect(mockDeps.searchPrecedent).toHaveBeenCalledWith({ query: '보증금' });
    expect(typeof result).toBe('string');
  });

  it('executes get_precedent_detail tool', async () => {
    const result = await executeToolCall('get_precedent_detail', '{"precedentId":"1"}', mockDeps);
    expect(mockDeps.getPrecedentDetail).toHaveBeenCalledWith('1');
    expect(typeof result).toBe('string');
  });

  it('executes search_administrative_rule tool', async () => {
    const result = await executeToolCall('search_administrative_rule', '{"query":"법률구조"}', mockDeps);
    expect(mockDeps.searchAdminRule).toHaveBeenCalledWith({ query: '법률구조' });
    expect(typeof result).toBe('string');
  });

  it('handles clarify_situation tool', async () => {
    const result = await executeToolCall('clarify_situation', '{"question":"계약 기간은?"}', mockDeps);
    expect(result).toContain('계약 기간은?');
  });

  it('returns error for unknown tool', async () => {
    const result = await executeToolCall('unknown_tool', '{}', mockDeps);
    expect(result).toContain('알 수 없는 도구');
  });

  it('returns error for invalid JSON arguments', async () => {
    const result = await executeToolCall('search_law', 'invalid json', mockDeps);
    expect(result).toContain('오류');
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run tests/lib/chat/tool-executor.test.ts
```

Expected: FAIL

- [ ] **Step 4: tool-executor 구현**

`lib/chat/tool-executor.ts`:
```typescript
import type { SearchParams } from '@/lib/law/client';
import type { LawSearchResult, LawDetail, PrecedentSearchResult, PrecedentDetail, AdminRuleSearchResult } from '@/lib/law/types';

export interface ToolExecutorDeps {
  searchLaw: (params: SearchParams) => Promise<LawSearchResult>;
  getLawDetail: (lawId: string) => Promise<LawDetail>;
  searchPrecedent: (params: SearchParams) => Promise<PrecedentSearchResult>;
  getPrecedentDetail: (precedentId: string) => Promise<PrecedentDetail>;
  searchAdminRule: (params: SearchParams) => Promise<AdminRuleSearchResult>;
}

export async function executeToolCall(
  toolName: string,
  argsJson: string,
  deps: ToolExecutorDeps,
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return `도구 인자 파싱 오류: 유효하지 않은 JSON`;
  }

  try {
    switch (toolName) {
      case 'search_law': {
        const result = await deps.searchLaw({
          query: String(args.query ?? ''),
          page: args.page ? Number(args.page) : undefined,
        });
        return JSON.stringify(result, null, 2);
      }
      case 'get_law_detail': {
        const result = await deps.getLawDetail(String(args.lawId ?? ''));
        return JSON.stringify(result, null, 2);
      }
      case 'search_precedent': {
        const result = await deps.searchPrecedent({
          query: String(args.query ?? ''),
        });
        return JSON.stringify(result, null, 2);
      }
      case 'get_precedent_detail': {
        const result = await deps.getPrecedentDetail(String(args.precedentId ?? ''));
        return JSON.stringify(result, null, 2);
      }
      case 'search_administrative_rule': {
        const result = await deps.searchAdminRule({
          query: String(args.query ?? ''),
        });
        return JSON.stringify(result, null, 2);
      }
      case 'clarify_situation': {
        return `[추가 질문] ${String(args.question ?? '')}`;
      }
      default:
        return `알 수 없는 도구: ${toolName}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return `도구 실행 오류 (${toolName}): ${message}`;
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run tests/lib/chat/tool-executor.test.ts
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add lib/zai/tools-schema.ts lib/chat/tool-executor.ts tests/lib/chat/
git commit -m "feat: function calling 도구 스키마 및 실행기

6개 도구 JSON Schema 정의 및 도구명->실행 함수 매핑"
```

---

## Task 7: 시스템 프롬프트 및 SSE 유틸

**Files:**
- Create: `lib/chat/system-prompt.ts`, `lib/utils/sse.ts`

- [ ] **Step 1: 시스템 프롬프트 작성**

`lib/chat/system-prompt.ts`:
```typescript
export const SYSTEM_PROMPT = `당신은 한국 법률 전문 AI 상담사입니다. 사용자의 법률 관련 질문에 정확하고 이해하기 쉬운 답변을 제공합니다.

## 답변 원칙

1. **근거 기반 답변**: 반드시 관련 법령이나 판례를 검색하여 근거를 제시하세요.
2. **단계적 상담**: 사용자의 상황이 불명확하면 clarify_situation 도구로 추가 질문을 하세요.
3. **구조화된 답변**: 관련 법령, 조문 번호, 판례 번호를 명시하고, 마크다운으로 읽기 좋게 정리하세요.
4. **쉬운 설명**: 법률 용어를 사용할 때는 괄호 안에 쉬운 설명을 추가하세요.

## 도구 사용 가이드

- 법률 질문을 받으면 먼저 search_law로 관련 법령을 검색하세요.
- 구체적인 조문이 필요하면 get_law_detail로 조문을 조회하세요.
- 유사 판례가 도움이 될 경우 search_precedent로 검색하세요.
- 행정 절차 관련 질문은 search_administrative_rule도 활용하세요.
- 사용자 상황 파악이 우선입니다. 정보가 부족하면 clarify_situation을 먼저 사용하세요.

## 주의사항

- 답변 끝에 다음 문구를 반드시 포함하세요: "이 답변은 AI 기반 법률 정보이며, 정식 법률 자문이 아닙니다. 구체적인 사안은 변호사와 상담하시기 바랍니다."
- 확실하지 않은 내용은 추측하지 말고, 해당 분야 전문가 상담을 권유하세요.
- 형사 사건 등 긴급 상황에서는 법률구조공단(132), 경찰(112) 등 긴급 연락처를 안내하세요.`;
```

- [ ] **Step 2: SSE 유틸 작성**

`lib/utils/sse.ts`:
```typescript
export interface SSEEvent {
  type: 'tool_call' | 'tool_result' | 'content' | 'error' | 'done';
  name?: string;
  args?: Record<string, unknown>;
  summary?: string;
  content?: string;
  message?: string;
}

export function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  writer: {
    write: (event: SSEEvent) => void;
    close: () => void;
  };
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    writer: {
      write(event: SSEEvent) {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      },
      close() {
        controller.close();
      },
    },
  };
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/chat/system-prompt.ts lib/utils/sse.ts
git commit -m "feat: 시스템 프롬프트 및 SSE 인코딩 유틸"
```

---

## Task 8: 채팅 오케스트레이터 (function calling 루프)

**Files:**
- Create: `lib/chat/orchestrator.ts`
- Test: `tests/lib/chat/orchestrator.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/chat/orchestrator.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { orchestrateChat, type OrchestratorDeps } from '@/lib/chat/orchestrator';
import type { SSEEvent } from '@/lib/utils/sse';

function createMockDeps(responses: Array<{
  content?: string | null;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}>): OrchestratorDeps {
  let callIndex = 0;

  return {
    zaiComplete: vi.fn().mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: resp?.content ?? null,
              tool_calls: resp?.toolCalls?.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            },
            finish_reason: resp?.toolCalls ? 'tool_calls' : 'stop',
          },
        ],
      };
    }),
    executeTool: vi.fn().mockResolvedValue('{"totalCount":1,"items":[]}'),
  };
}

describe('orchestrateChat', () => {
  it('returns content directly when no tool calls', async () => {
    const deps = createMockDeps([{ content: '안녕하세요!' }]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '안녕' }],
      (e) => events.push(e),
      deps,
    );

    expect(events).toContainEqual({ type: 'content', content: '안녕하세요!' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('executes tool calls and re-queries LLM', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [{ id: 'call_1', name: 'search_law', arguments: '{"query":"임대차"}' }],
      },
      { content: '주택임대차보호법에 따르면...' },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차법 알려줘' }],
      (e) => events.push(e),
      deps,
    );

    expect(events.some((e) => e.type === 'tool_call' && e.name === 'search_law')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    expect(events.some((e) => e.type === 'content')).toBe(true);
    expect(deps.executeTool).toHaveBeenCalledWith('search_law', '{"query":"임대차"}');
  });

  it('stops after max 5 tool call rounds', async () => {
    const infiniteToolCalls = Array.from({ length: 6 }, () => ({
      toolCalls: [{ id: 'call_x', name: 'search_law', arguments: '{"query":"test"}' }],
    }));
    const deps = createMockDeps(infiniteToolCalls);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: 'test' }],
      (e) => events.push(e),
      deps,
    );

    // zaiComplete should be called at most 6 times (5 tool rounds + initial)
    expect(deps.zaiComplete).toHaveBeenCalledTimes(6);
    expect(events.some((e) => e.type === 'content' && e.content?.includes('수집된 정보'))).toBe(true);
  });

  it('handles clarify_situation specially', async () => {
    const deps = createMockDeps([
      {
        toolCalls: [{ id: 'call_1', name: 'clarify_situation', arguments: '{"question":"계약 기간은?"}' }],
      },
    ]);
    const events: SSEEvent[] = [];

    await orchestrateChat(
      [{ role: 'user', content: '임대차 문제가 있어요' }],
      (e) => events.push(e),
      deps,
    );

    expect(events.some((e) => e.type === 'content' && e.content?.includes('계약 기간은?'))).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/chat/orchestrator.test.ts
```

Expected: FAIL

- [ ] **Step 3: 오케스트레이터 구현**

`lib/chat/orchestrator.ts`:
```typescript
import type { ChatMessage, ToolDefinition, ZaiResponse } from '@/lib/zai/types';
import type { SSEEvent } from '@/lib/utils/sse';
import { LAW_TOOLS } from '@/lib/zai/tools-schema';
import { SYSTEM_PROMPT } from './system-prompt';

const MAX_TOOL_ROUNDS = 5;

export interface OrchestratorDeps {
  zaiComplete: (messages: ChatMessage[], tools: ToolDefinition[]) => Promise<ZaiResponse>;
  executeTool: (toolName: string, argsJson: string) => Promise<string>;
}

export async function orchestrateChat(
  userMessages: ChatMessage[],
  emit: (event: SSEEvent) => void,
  deps: OrchestratorDeps,
): Promise<void> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
  ];

  let toolRounds = 0;

  while (toolRounds <= MAX_TOOL_ROUNDS) {
    const response = await deps.zaiComplete(messages, LAW_TOOLS);
    const choice = response.choices[0];
    const message = choice?.message;

    if (!message) {
      emit({ type: 'error', message: 'LLM 응답이 비어있습니다' });
      break;
    }

    const toolCalls = message.tool_calls;

    // function call이 없으면 최종 답변
    if (!toolCalls || toolCalls.length === 0) {
      if (message.content) {
        emit({ type: 'content', content: message.content });
      }
      break;
    }

    // 최대 도구 호출 횟수 초과
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      emit({
        type: 'content',
        content: '수집된 정보를 기반으로 답변드립니다. 추가적인 법령 검색이 필요할 수 있습니다.',
      });
      break;
    }

    // assistant 메시지 추가 (tool_calls 포함)
    messages.push({
      role: 'assistant',
      content: message.content ?? '',
    });

    // 각 도구 호출 실행
    for (const toolCall of toolCalls) {
      const { name, arguments: argsJson } = toolCall.function;

      emit({
        type: 'tool_call',
        name,
        args: safeParseJson(argsJson),
      });

      // clarify_situation은 바로 사용자에게 질문 반환
      if (name === 'clarify_situation') {
        const parsed = safeParseJson(argsJson);
        const question = String(parsed?.question ?? '추가 정보가 필요합니다.');
        emit({ type: 'content', content: question });
        emit({ type: 'done' });
        return;
      }

      const result = await deps.executeTool(name, argsJson);

      emit({
        type: 'tool_result',
        name,
        summary: summarizeToolResult(name, result),
      });

      // tool 응답을 메시지에 추가
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    toolRounds++;
  }

  emit({ type: 'done' });
}

function safeParseJson(json: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function summarizeToolResult(toolName: string, result: string): string {
  try {
    const parsed = JSON.parse(result) as Record<string, unknown>;
    if ('totalCount' in parsed) {
      return `${parsed.totalCount}건 발견`;
    }
    if ('lawNameKo' in parsed) {
      return `${parsed.lawNameKo} 조회 완료`;
    }
    if ('caseName' in parsed) {
      return `${parsed.caseName} 조회 완료`;
    }
    return '조회 완료';
  } catch {
    return result.slice(0, 50);
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/chat/orchestrator.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/chat/orchestrator.ts tests/lib/chat/orchestrator.test.ts
git commit -m "feat: function calling 오케스트레이터

최대 5라운드 도구 호출 루프, clarify_situation 특수 처리"
```

---

## Task 9: API Route Handler

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Route Handler 구현**

`app/api/chat/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { createZaiClient } from '@/lib/zai/client';
import { createLawApiClient } from '@/lib/law/client';
import { searchLaw } from '@/lib/law/search-law';
import { getLawDetail } from '@/lib/law/get-law-detail';
import { searchPrecedent } from '@/lib/law/search-precedent';
import { getPrecedentDetail } from '@/lib/law/get-precedent-detail';
import { searchAdminRule } from '@/lib/law/search-admin-rule';
import { executeToolCall } from '@/lib/chat/tool-executor';
import { orchestrateChat } from '@/lib/chat/orchestrator';
import { createSSEStream } from '@/lib/utils/sse';
import type { ChatMessage } from '@/lib/zai/types';

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;

interface ChatRequestBody {
  messages: ChatMessage[];
}

function validateRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('요청 본문이 비어있습니다');
  }

  const { messages } = body as Record<string, unknown>;

  if (!Array.isArray(messages)) {
    throw new Error('messages는 배열이어야 합니다');
  }

  if (messages.length === 0) {
    throw new Error('메시지가 비어있습니다');
  }

  if (messages.length > MAX_MESSAGES) {
    throw new Error(`메시지는 최대 ${MAX_MESSAGES}개까지 가능합니다`);
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw new Error('각 메시지에는 role과 content가 필요합니다');
    }
    if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`메시지 길이는 최대 ${MAX_MESSAGE_LENGTH}자까지 가능합니다`);
    }
  }

  return { messages: messages as ChatMessage[] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = validateRequest(body);

    const zaiClient = createZaiClient();
    const lawClient = createLawApiClient();

    const { stream, writer } = createSSEStream();

    // 백그라운드에서 오케스트레이션 실행
    const orchestrationPromise = orchestrateChat(
      messages,
      (event) => writer.write(event),
      {
        zaiComplete: (msgs, tools) => zaiClient.completeChatWithTools(msgs, tools),
        executeTool: (name, args) =>
          executeToolCall(name, args, {
            searchLaw: (params) => searchLaw(lawClient, params),
            getLawDetail: (id) => getLawDetail(lawClient, id),
            searchPrecedent: (params) => searchPrecedent(lawClient, params),
            getPrecedentDetail: (id) => getPrecedentDetail(lawClient, id),
            searchAdminRule: (params) => searchAdminRule(lawClient, params),
          }),
      },
    );

    // 오케스트레이션 완료 후 스트림 닫기
    orchestrationPromise
      .catch((error) => {
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        writer.write({ type: 'error', message });
      })
      .finally(() => {
        writer.close();
      });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add app/api/chat/route.ts
git commit -m "feat: /api/chat SSE 스트리밍 Route Handler

입력 검증, 오케스트레이션 연결, SSE 응답 스트리밍"
```

---

## Task 10: 프론트엔드 공통 컴포넌트

**Files:**
- Create: `app/components/common/Disclaimer.tsx`, `app/components/common/LoadingDots.tsx`

- [ ] **Step 1: 면책 고지 컴포넌트**

`app/components/common/Disclaimer.tsx`:
```tsx
export function Disclaimer() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      본 서비스는 AI 기반 법률 정보 제공 서비스이며, 법률 자문이 아닙니다.
      정확한 법적 판단은 반드시 변호사와 상담하시기 바랍니다.
    </div>
  );
}
```

- [ ] **Step 2: 로딩 인디케이터 컴포넌트**

`app/components/common/LoadingDots.tsx`:
```tsx
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
    </span>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/components/common/
git commit -m "feat: 면책 고지 및 로딩 인디케이터 컴포넌트"
```

---

## Task 11: 프론트엔드 채팅 컴포넌트

**Files:**
- Create: `app/components/chat/ChatInput.tsx`, `app/components/chat/MessageBubble.tsx`, `app/components/chat/ToolCallIndicator.tsx`, `app/components/chat/MessageList.tsx`, `app/components/chat/ChatContainer.tsx`

- [ ] **Step 1: ChatInput 컴포넌트**

`app/components/chat/ChatInput.tsx`:
```tsx
'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // 자동 높이 조절
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="법률 관련 질문을 입력하세요..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: MessageBubble 컴포넌트**

`app/components/chat/MessageBubble.tsx`:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-li:text-gray-900 prose-strong:text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ToolCallIndicator 컴포넌트**

`app/components/chat/ToolCallIndicator.tsx`:
```tsx
import { LoadingDots } from '@/app/components/common/LoadingDots';

const TOOL_LABELS: Record<string, string> = {
  search_law: '법령 검색',
  get_law_detail: '법령 조문 조회',
  search_precedent: '판례 검색',
  get_precedent_detail: '판례 상세 조회',
  search_administrative_rule: '행정규칙 검색',
  clarify_situation: '추가 질문 준비',
};

interface ToolCallIndicatorProps {
  toolName: string;
  status: 'calling' | 'done';
  summary?: string;
}

export function ToolCallIndicator({ toolName, status, summary }: ToolCallIndicatorProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 my-1 ml-2 text-xs text-gray-500">
      <span className="inline-block h-4 w-4 rounded bg-blue-100 text-blue-600 text-center leading-4 text-[10px] font-bold">
        {status === 'calling' ? '...' : 'OK'}
      </span>
      <span>{label}</span>
      {status === 'calling' && <LoadingDots />}
      {status === 'done' && summary && (
        <span className="text-gray-400">- {summary}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: MessageList 컴포넌트**

`app/components/chat/MessageList.tsx`:
```tsx
'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolCallIndicator } from './ToolCallIndicator';
import { LoadingDots } from '@/app/components/common/LoadingDots';

export interface ChatEvent {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result';
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  toolName?: string;
  toolStatus?: 'calling' | 'done';
  toolSummary?: string;
}

interface MessageListProps {
  events: ChatEvent[];
  isStreaming: boolean;
}

export function MessageList({ events, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-1">
        {events.map((event) => {
          if (event.type === 'message' && event.role && event.content) {
            return (
              <MessageBubble
                key={event.id}
                role={event.role}
                content={event.content}
              />
            );
          }
          if ((event.type === 'tool_call' || event.type === 'tool_result') && event.toolName) {
            return (
              <ToolCallIndicator
                key={event.id}
                toolName={event.toolName}
                status={event.toolStatus ?? 'calling'}
                summary={event.toolSummary}
              />
            );
          }
          return null;
        })}
        {isStreaming && events[events.length - 1]?.type !== 'tool_call' && (
          <div className="flex justify-start my-2">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: ChatContainer 컴포넌트**

`app/components/chat/ChatContainer.tsx`:
```tsx
'use client';

import { useState, useCallback } from 'react';
import { ChatInput } from './ChatInput';
import { MessageList, type ChatEvent } from './MessageList';
import type { SSEEvent } from '@/lib/utils/sse';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

let eventIdCounter = 0;
function nextId(): string {
  return `evt-${++eventIdCounter}`;
}

export function ChatContainer() {
  const [events, setEvents] = useState<ChatEvent[]>([
    {
      id: 'welcome',
      type: 'message',
      role: 'system',
      content: '한국 법률 상담 AI입니다. 법률 관련 질문을 자유롭게 입력해주세요.',
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSend = useCallback(async (userMessage: string) => {
    // 사용자 메시지 추가
    const userEvent: ChatEvent = {
      id: nextId(),
      type: 'message',
      role: 'user',
      content: userMessage,
    };
    setEvents((prev) => [...prev, userEvent]);

    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
    setConversationHistory(updatedHistory);
    setIsStreaming(true);

    let assistantContent = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? '서버 오류');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('스트림을 읽을 수 없습니다');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);

          try {
            const event = JSON.parse(data) as SSEEvent;

            switch (event.type) {
              case 'tool_call':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'tool_call',
                    toolName: event.name,
                    toolStatus: 'calling',
                  },
                ]);
                break;

              case 'tool_result':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'tool_result',
                    toolName: event.name,
                    toolStatus: 'done',
                    toolSummary: event.summary,
                  },
                ]);
                break;

              case 'content':
                assistantContent += (event.content ?? '');
                setEvents((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.type === 'message' && last.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantContent },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: nextId(),
                      type: 'message',
                      role: 'assistant' as const,
                      content: assistantContent,
                    },
                  ];
                });
                break;

              case 'error':
                setEvents((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    type: 'message',
                    role: 'system',
                    content: `오류: ${event.message ?? '알 수 없는 오류'}`,
                  },
                ]);
                break;

              case 'done':
                break;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }

      if (assistantContent) {
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: assistantContent },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '연결 오류';
      setEvents((prev) => [
        ...prev,
        { id: nextId(), type: 'message', role: 'system', content: `오류: ${message}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory]);

  return (
    <div className="flex h-full flex-col">
      <MessageList events={events} isStreaming={isStreaming} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add app/components/
git commit -m "feat: 채팅 UI 컴포넌트

ChatContainer, MessageList, MessageBubble, ChatInput,
ToolCallIndicator, Disclaimer, LoadingDots"
```

---

## Task 12: 메인 페이지 통합

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: layout.tsx 수정**

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '한국 법률 상담 AI',
  description: '국가법령정보센터 기반 AI 법률 상담 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: page.tsx 수정**

`app/page.tsx`:
```tsx
import { Disclaimer } from '@/app/components/common/Disclaimer';
import { ChatContainer } from '@/app/components/chat/ChatContainer';

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <Disclaimer />
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-center text-lg font-semibold text-gray-900">
          한국 법률 상담 AI
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: globals.css 정리** (Tailwind 기본만 유지)

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: 메인 페이지 통합

면책 고지 + 헤더 + 채팅 컨테이너 조합"
```

---

## Task 13: 환경 설정 및 배포 준비

**Files:**
- Modify: `next.config.js`
- Create: `.env.local` (gitignored, 로컬 테스트용)

- [ ] **Step 1: next.config.js 수정**

`next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 국가법령정보센터 API 호출을 위해 Node.js runtime 필수
  experimental: {
    serverComponentsExternalPackages: ['fast-xml-parser'],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: .env.local 생성 (로컬 테스트용)**

```bash
cp .env.example .env.local
```

실제 API 키를 `.env.local`에 입력.

- [ ] **Step 3: 로컬 개발 서버 실행 및 수동 테스트**

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속하여:
1. 면책 고지 배너 표시 확인
2. "주택임대차보호법에 대해 알려주세요" 입력
3. 도구 호출 인디케이터 표시 확인
4. 스트리밍 답변 수신 확인
5. 마크다운 렌더링 확인

- [ ] **Step 4: 전체 테스트 실행**

```bash
npm run test:run
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add next.config.js .env.example
git commit -m "chore: 환경 설정 및 배포 준비

next.config.js 설정, .env.example 업데이트"
```

---

## Task 14: 법률 카드 컴포넌트 (선택적 개선)

**Files:**
- Create: `app/components/law/LawArticleCard.tsx`, `app/components/law/PrecedentCard.tsx`

이 태스크는 MVP 이후 개선 사항입니다. 현재 마크다운 렌더링으로 법률 정보가 표시되지만, 전용 카드 컴포넌트를 추가하면 가독성이 향상됩니다.

- [ ] **Step 1: LawArticleCard**

`app/components/law/LawArticleCard.tsx`:
```tsx
interface LawArticleCardProps {
  lawName: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

export function LawArticleCard({ lawName, articleNumber, articleTitle, articleContent }: LawArticleCardProps) {
  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-1 text-xs font-medium text-blue-600">{lawName}</div>
      <div className="mb-2 text-sm font-semibold text-gray-900">
        {articleNumber} {articleTitle}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{articleContent}</p>
    </div>
  );
}
```

- [ ] **Step 2: PrecedentCard**

`app/components/law/PrecedentCard.tsx`:
```tsx
interface PrecedentCardProps {
  caseName: string;
  caseNumber: string;
  courtName: string;
  judgmentDate: string;
  summary: string;
}

export function PrecedentCard({ caseName, caseNumber, courtName, judgmentDate, summary }: PrecedentCardProps) {
  return (
    <div className="my-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-purple-600">
        <span>{courtName}</span>
        <span>{judgmentDate}</span>
      </div>
      <div className="mb-2 text-sm font-semibold text-gray-900">{caseName}</div>
      <div className="mb-1 text-xs text-gray-500">{caseNumber}</div>
      <p className="text-sm text-gray-700">{summary}</p>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/components/law/
git commit -m "feat: 법령 조문/판례 전용 카드 컴포넌트"
```

---

## 최종 체크리스트

모든 태스크 완료 후 확인:

- [ ] `npm run build` 성공
- [ ] `npm run test:run` 전체 통과
- [ ] 로컬 `npm run dev`에서 수동 E2E 테스트 통과
- [ ] `.env.local`이 `.gitignore`에 포함
- [ ] API 키가 소스코드에 하드코딩되지 않음
- [ ] 면책 고지가 표시됨
