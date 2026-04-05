# 한국 법률 상담 챗봇 설계 문서

## 개요

국가법령정보센터 Open API와 Z.ai GLM-4.7 모델을 활용한 웹 기반 법률 상담 챗봇. 사용자가 자유롭게 법률 질문을 하면 LLM이 필요에 따라 법령/판례/행정규칙을 검색하고, 근거 기반 답변을 스트리밍으로 제공한다.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 배포 형태 | 웹 애플리케이션 |
| 프레임워크 | Next.js 14+ App Router (React + TypeScript) |
| 스타일링 | Tailwind CSS |
| 배포 환경 | Vercel (stateless, serverless) |
| LLM | Z.ai GLM-4.7 (function calling + SSE 스트리밍) |
| 법률 데이터 | 국가법령정보센터 API를 TypeScript로 직접 호출 |
| 상담 방식 | 하이브리드 (자유 대화 + LLM이 필요시 추가 질문) |

## 아키텍처

```
[사용자 브라우저]
    |
    | (SSE 스트리밍)
    v
[Next.js on Vercel]
    |
    +-- app/                  (React 프론트엔드)
    |   +-- page.tsx          (채팅 UI)
    |
    +-- app/api/chat/         (Route Handler - 핵심 오케스트레이터)
    |   +-- route.ts          Z.ai 호출 + function calling 루프
    |
    +-- lib/
        +-- zai-client.ts     (Z.ai API 클라이언트)
        +-- law-client.ts     (국가법령정보센터 API 클라이언트)
        +-- tools.ts          (function calling 도구 정의)

[외부 API]
    +-- Z.ai GLM-4.7         (LLM - 대화/추론)
    +-- open.law.go.kr        (법령/판례/행정규칙 데이터)
```

### 핵심 흐름

1. 사용자가 질문 입력
2. `/api/chat`이 Z.ai에 메시지 + 도구 정의를 전송
3. Z.ai가 function call 응답 (예: `search_law("주택임대차보호법")`)
4. 서버가 국가법령정보센터 API를 호출하여 결과 획득
5. 결과를 Z.ai에 재주입하여 최종 답변 생성
6. SSE 스트리밍으로 사용자에게 전달

## Function Calling 도구

| 도구명 | 파라미터 | 설명 |
|--------|----------|------|
| `search_law` | `query: string`, `page?: number` | 법령 키워드 검색 |
| `get_law_detail` | `lawId: string` | 특정 법령의 조문 상세 조회 |
| `search_precedent` | `query: string`, `court?: string` | 판례 검색 (법원 필터 가능) |
| `get_precedent_detail` | `precedentId: string` | 판례 상세 조회 |
| `search_administrative_rule` | `query: string` | 행정규칙/훈령/예규 검색 |
| `clarify_situation` | `question: string` | 사용자에게 추가 질문 (하이브리드 상담용) |

### Function Calling 루프

```
maxCalls = 5
callCount = 0

while (callCount < maxCalls) {
  response = Z.ai에 메시지 전송 (도구 정의 포함)

  if (response가 일반 텍스트) -> SSE로 스트리밍 후 break
  if (response가 function_call) -> {
    도구 실행 (법령 API 호출)
    결과를 tool role 메시지로 대화에 추가
    callCount++
    continue
  }
}

if (callCount >= maxCalls) -> "수집된 정보 기반으로 답변합니다" 메시지
```

## 프론트엔드 구조

```
app/
+-- layout.tsx                # 루트 레이아웃 (메타데이터, 폰트)
+-- page.tsx                  # 메인 채팅 페이지
+-- globals.css               # Tailwind + 커스텀 스타일
+-- components/
    +-- chat/
    |   +-- ChatContainer.tsx     # 채팅 전체 래퍼
    |   +-- MessageList.tsx       # 메시지 목록 (스크롤)
    |   +-- MessageBubble.tsx     # 개별 메시지 (마크다운 렌더링)
    |   +-- ChatInput.tsx         # 입력창 + 전송 버튼
    |   +-- ToolCallIndicator.tsx # "법령 검색 중..." 표시
    +-- law/
    |   +-- LawArticleCard.tsx    # 법령 조문 카드
    |   +-- PrecedentCard.tsx     # 판례 카드
    +-- common/
        +-- Disclaimer.tsx        # 면책 고지 배너
        +-- LoadingDots.tsx       # 타이핑 인디케이터
```

### 프론트엔드 설계 결정

- **마크다운 렌더링**: `react-markdown` + `remark-gfm`으로 법률 조문/판례를 구조화 표시
- **대화 히스토리**: `useState`로 클라이언트 사이드 유지 (stateless 서버). 새로고침 시 초기화
- **스트리밍 표시**: SSE로 수신하면서 실시간 렌더링. 도구 호출 시 "법령 검색 중..." 인디케이터 표시
- **면책 고지**: 페이지 상단에 고정 배너 + 첫 메시지에서 안내

## 백엔드 API 구조

```
app/api/
+-- chat/
    +-- route.ts                # POST - 채팅 엔드포인트 (SSE 스트리밍 응답)

lib/
+-- zai/
|   +-- client.ts               # Z.ai API 클라이언트 (스트리밍 + function calling)
|   +-- types.ts                # Z.ai 요청/응답 타입 정의
|   +-- tools-schema.ts         # function calling 도구 스키마 (JSON Schema)
+-- law/
|   +-- client.ts               # 국가법령정보센터 API 클라이언트
|   +-- types.ts                # 법령/판례 응답 타입
|   +-- search-law.ts           # 법령 검색
|   +-- get-law-detail.ts       # 법령 상세 조회
|   +-- search-precedent.ts     # 판례 검색
|   +-- get-precedent-detail.ts # 판례 상세
|   +-- search-admin-rule.ts    # 행정규칙 검색
+-- chat/
|   +-- orchestrator.ts         # function calling 루프 핵심 로직
|   +-- tool-executor.ts        # 도구명 -> 실행 함수 매핑
|   +-- system-prompt.ts        # 법률 상담사 시스템 프롬프트
+-- utils/
    +-- sse.ts                  # SSE 인코딩/파싱 유틸
```

### API 요청/응답

```
POST /api/chat
Request:
{
  "messages": [
    { "role": "user", "content": "전세 보증금 문제..." }
  ]
}

Response: SSE 스트리밍 (Content-Type: text/event-stream)
data: {"type":"tool_call","name":"search_law","args":{"query":"주택임대차보호법"}}
data: {"type":"tool_result","name":"search_law","summary":"3건 발견"}
data: {"type":"content","content":"주택임대차보호법에 따르면..."}
data: {"type":"content","content":"제3조에서는..."}
data: {"type":"done"}
```

### 시스템 프롬프트 핵심 지침

- 한국 법률 전문 상담사 역할 부여
- 반드시 법령/판례 근거를 제시하도록 지시
- 정보가 부족하면 `clarify_situation` 도구로 추가 질문
- 법률 자문이 아님을 답변 말미에 안내

## 환경 변수

| 변수명 | 용도 | 필수 |
|--------|------|------|
| `ZAI_API_KEY` | Z.ai GLM-4.7 API 인증 | O |
| `LAW_API_KEY` | 국가법령정보센터 API 키 (OC) | O |
| `NEXT_PUBLIC_APP_NAME` | 앱 이름 표시용 | X |

서버사이드 전용이므로 `NEXT_PUBLIC_` 접두사 불필요 (API 키 노출 방지).

## 의존성

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "react-markdown": "^9",
    "remark-gfm": "^4",
    "fast-xml-parser": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

## 배포

- Vercel에 GitHub 연동 자동 배포
- Node.js runtime 사용 (국가법령정보센터 API가 XML 응답이라 Edge Runtime 불가)
- Vercel Hobby 플랜 (serverless function 실행 시간 제한 60초)

### 60초 제한 대응

- function calling 루프 최대 5회 제한
- 국가법령정보센터 API 호출에 개별 10초 타임아웃
- 전체 요청에 50초 safety timeout

## 에러 처리

| 상황 | 대응 |
|------|------|
| Z.ai API 401/429 | 사용자에게 "일시적 오류" 메시지, 서버 로그에 상세 기록 |
| 국가법령정보센터 API 실패 | LLM에게 "검색 실패" 결과 전달. LLM이 자연스럽게 안내 |
| function calling 루프 5회 초과 | 강제 종료 후 "수집된 정보 기반으로 답변합니다" 메시지 |
| SSE 연결 끊김 | 프론트에서 감지 후 재시도 안내 표시 |
| 50초 타임아웃 | 진행 중인 스트리밍 중단, 부분 답변이라도 표시 |

## 보안

- API 키는 서버사이드에서만 사용 (클라이언트에 노출 없음)
- `/api/chat` 입력 검증: 메시지 배열 형식 확인, 최대 메시지 수 50개, 단일 메시지 길이 2000자 제한
- Rate limiting: Vercel 기본 제공 + 프론트에서 전송 버튼 디바운싱
- XSS 방지: `react-markdown`이 기본적으로 HTML 새니타이징 수행
- XML 파싱 시 외부 엔티티 비활성화

## 면책 고지

> "본 서비스는 AI 기반 법률 정보 제공 서비스이며, 법률 자문이 아닙니다. 정확한 법적 판단은 반드시 변호사와 상담하시기 바랍니다."

- 페이지 상단 고정 배너
- 첫 대화 시작 시 시스템 메시지로 1회 표시

## MVP 기능 범위

1. 법령 검색 + 조문 조회
2. 판례 검색 + 상세 조회
3. 행정규칙 검색
4. 대화 히스토리 유지 (클라이언트 사이드, 세션 내)
5. 마크다운 렌더링 (법률 조문, 판례 포맷팅)
6. 면책 고지
