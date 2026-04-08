<!--
Sync Impact Report
===================
Version change: 0.0.0 (template) -> 1.0.0
Bump rationale: MAJOR - 최초 제정 (템플릿에서 실제 헌법으로 전환)

Modified principles: N/A (최초 제정)

Added sections:
  - Core Principles (7개 신규 원칙)
  - 보안 및 법적 준수 제약사항
  - 개발 워크플로우
  - Governance

Removed sections:
  - 템플릿 placeholder 주석 전체 제거

Templates requiring updates:
  - .specify/templates/plan-template.md: 수정 불필요 (동적 Constitution Check 게이트)
  - .specify/templates/spec-template.md: 수정 불필요 (범용 FR 넘버링 호환)
  - .specify/templates/tasks-template.md: 수정 불필요 (범용 태스크 분류)
  - .specify/templates/commands/: 해당 없음 (디렉토리 미존재)

Follow-up TODOs: 없음
-->

# AI Law Counsel Constitution

## Core Principles

### I. 근거 기반 답변 (Evidence-Based Legal Response)

모든 법률 답변은 국가법령정보센터 API에서 검색한 실제 법률 출처를 인용해야 한다.

- 시스템은 법령 ID, 판례 번호, 조문 내용을 날조(fabrication)해서는 **절대 안 된다(MUST NOT)**.
- 오케스트레이터의 `done` SSE 이벤트는 `type`, `name`, `identifier`를 포함하는
  중복 제거된 `sources` 배열을 **반드시 포함해야 한다(MUST)**.
- 도구 호출 후 관련 법률 출처를 찾지 못한 경우, 응답은 출처를 만들어내는 대신
  해당 사실을 **명시적으로 고지해야 한다(MUST)**.
- 근거: `lib/chat/orchestrator.ts`의 `extractSources`, `deduplicateSources` 함수로 구현됨.

### II. 법률 면책 고지 (Mandatory Legal Disclaimer)

법률 면책 고지는 3단계로 **반드시 표시되어야 한다(MUST)**:

1. **UI 배너**: `app/components/common/Disclaimer.tsx`를 통한 상시 표시
2. **시스템 프롬프트**: `lib/chat/system-prompt.ts`에서 LLM이 모든 실질적 응답에
   "이 답변은 AI 기반 법률 정보이며, 정식 법률 자문이 아닙니다" 면책 문구를 포함하도록 지시
3. **문서**: README 및 모든 공개 문서에 면책 조항 명시

- 어떤 코드 변경도 이 3단계 중 하나라도 제거하거나 약화시켜서는 **안 된다(SHOULD NOT)**.
- 긴급 상황(형사 사건, 급박한 사안)은 핫라인 번호(법률구조공단 132, 경찰 112)를
  추가로 **표시해야 한다(MUST)**.

### III. 정부 데이터 무결성 (Government Data Fidelity)

law.go.kr API에서 검색한 데이터는 의미적 내용을 변경 없이 **충실히 표시해야 한다(MUST)**.

- XML 파싱 계층(`lib/law/*.ts`)은 한국어 XML 필드명을 명시적 `String()` 변환과
  폴백을 사용하여 타입이 지정된 영문 인터페이스로 매핑해야 한다.
- `lib/law/types.ts`의 모든 데이터 타입 속성에 `readonly` 수정자를 **적용해야 한다(MUST)**.
- `lib/utils/sanitize-content.ts`의 `sanitizeContent` 유틸리티는 HTML 표현 태그를
  Markdown 등가물로만 변환해야 하며, 실질적 법률 텍스트 내용을 제거하거나
  수정해서는 **안 된다(MUST NOT)**.
- 알 수 없는 HTML 태그는 **보존해야 한다(MUST)**.

### IV. 제한된 자율 도구 사용 (Bounded Autonomous Tool Use)

함수 호출 오케스트레이터는 `MAX_TOOL_ROUNDS = 10` 반복의 하드 상한을 **적용해야 한다(MUST)**.

- 한도 도달 시 시스템은 수집된 정보만으로 최종 답변을 생성하도록 지시하는
  `TOOL_LIMIT_GUIDE` 시스템 메시지를 **삽입해야 한다(MUST)**.
- `clarify_situation` 도구는 루프를 **즉시 단락(short-circuit)시켜야 한다(MUST)** --
  사용자에게 질문을 전달하고 추가 도구 실행 없이 `done`을 발행한다.
- `clarify_situation`을 제외한 모든 도구 호출은 MCP 브릿지(`callMcpTool`)를 통해
  **전달되어야 한다(MUST)**.
- korean-law-mcp 서버를 통해 추가된 새 도구는 하드코딩이 아닌 `listMcpTools()`를
  통해 동적으로 **발견되어야 한다(MUST)**.
- 근거: `lib/chat/orchestrator.ts`, `lib/chat/tool-executor.ts`에서 구현됨.

### V. 무상태 서버리스 아키텍처 (Stateless Serverless Architecture)

서버는 요청 간에 **무상태를 유지해야 한다(MUST)**.

- 사용자 대화 데이터, PII, 세션 상태를 서버 측에 저장해서는 **안 된다(SHOULD NOT)**.
- 대화 이력 영속성은 `app/hooks/useConversationHistory.ts`의 `localStorage`를 통해
  클라이언트 측에서 **독점적으로 관리한다**.
- API 라우트는 요청당 전체 메시지 이력을 수신하며, `MAX_CONTEXT_MESSAGES = 50` 제한을
  **적용해야 한다(MUST)**. 클라이언트는 전송 전 윈도잉(최근 10턴 = 20메시지)을 적용한다.
- MCP 클라이언트(`lib/mcp/client.ts`)의 모듈 레벨 싱글톤 캐싱은 무상태 연결의
  웜 스타트 최적화 **목적으로만 허용된다**.
- API 키는 서버 측 환경 변수로만 존재해야 하며, 클라이언트에 **노출되어서는 안 된다(MUST NOT)**.

### VI. 테스트 용이성을 위한 의존성 주입 (DI for Testability)

모든 외부 의존성(LLM 호출, MCP 도구 호출, API 요청)은 타입이 지정된 인터페이스를 통해
**주입 가능해야 한다(MUST)**.

- `OrchestratorDeps` 인터페이스(`zaiComplete`, `zaiStream`, `executeTool`, `tools`)와
  `ToolExecutorDeps` 인터페이스(`callMcpTool`)가 이 패턴을 확립한다.
- 테스트 파일은 모듈 몽키패칭이 아닌, 이러한 인터페이스를 준수하는 `vi.fn()` 목을
  **사용해야 한다(MUST)**.
- XML 파싱, 도구 브릿징, 오케스트레이션, 콘텐츠 새니타이제이션의 모든 계층은
  전용 단위 테스트를 **보유해야 한다(MUST)**.
- 새로운 기능은 병합 전 해당 테스트를 **포함해야 한다(MUST)**.
- 근거: `tests/` 디렉토리 전반의 12개 테스트 파일, 58개 테스트 케이스로 확립됨.

### VII. 한국어 우선 사용자 경험 (Korean-First UX)

전체 사용자 대면 인터페이스, 시스템 프롬프트, 오류 메시지는 **한국어여야 한다(MUST)**.

- `lib/chat/system-prompt.ts`의 시스템 프롬프트는 LLM이 법률 용어에 대해 괄호 설명을
  포함한 평이한 한국어를 **사용하도록 지시해야 한다(MUST)**.
- 서버 측 오류 메시지(`route.ts`의 유효성 검사 오류, `client.ts`의 API 오류)는
  **한국어여야 한다(MUST)**.
- Markdown 렌더링 파이프라인(`MessageBubble.tsx` + `@tailwindcss/typography`)은
  법조문 구조화 제목, 조문번호 인라인 코드, 핵심 조항 인용구, 비교 정보 GFM 테이블 등
  한국어 법률 콘텐츠 패턴에 **최적화되어야 한다(MUST)**.
- 테스트 설명(describe/it 문자열)은 한국어로 **작성해야 한다(MUST)**.

## 보안 및 법적 준수 제약사항

### API 키 격리

- `ZAI_API_KEY`와 `LAW_API_KEY`는 서버 측 환경 변수(`.env.local` 또는 Vercel 환경 설정)로만
  존재해야 한다(MUST).
- `.env.example`은 placeholder 값만 포함해야 한다. `.gitignore`는 `.env.local`과 `.env`를
  포함해야 한다(MUST).

### PII 미저장

- 서버는 사용자 입력이나 대화 데이터를 영속화해서는 안 된다(MUST NOT).
- 대화 이력은 `MAX_CONVERSATIONS = 50`으로 제한하며, `QuotaExceededError` 처리 시
  우아한 저하(80% 트림 후 필요 시 전체 삭제)를 적용한다.

### 입력 검증

- 채팅 API 라우트는 다음을 검증해야 한다(MUST): messages가 배열이고, 비어있지 않으며,
  최대 `MAX_CONTEXT_MESSAGES`(50)개, 각 메시지에 `role`과 `content`가 있고,
  콘텐츠 길이가 `MAX_MESSAGE_LENGTH`(2000자)를 초과하지 않음.
- 유효하지 않은 요청은 한국어 오류 메시지와 함께 HTTP 400을 반환해야 한다(MUST).

### XSS 방지

- 어시스턴트 응답은 기본적으로 원시 HTML을 이스케이프하는 `react-markdown` +
  `remark-gfm`을 통해 렌더링해야 한다(MUST).
- 사용자 입력 표시에 `dangerouslySetInnerHTML`을 사용해서는 안 된다(MUST NOT).

### 외부 API 안전

- law.go.kr에 대한 모든 `fetch` 호출은 `AbortController` 타임아웃
  (`TIMEOUT_MS = 10_000`)을 포함해야 한다(MUST).
- 모든 MCP 연결은 연결 타임아웃(`CONNECTION_TIMEOUT_MS = 15_000`)을
  포함해야 한다(MUST).

### 의존성 최소주의

- 프로덕션 의존성은 최소한으로 유지해야 한다(MUST). 새 의존성 추가는
  필요성을 입증해야 하며, 기존 프레임워크 기능과 중복되어서는 안 된다(SHOULD NOT).

## 개발 워크플로우

### TypeScript Strict Mode

- `tsconfig.json`은 `"strict": true`를 유지해야 한다(MUST).
- 내보낸 함수는 명시적 매개변수 및 반환 타입을 가져야 한다(MUST).
- `any`는 애플리케이션 코드에 나타나서는 안 된다(MUST NOT). 외부 데이터에는
  `unknown`과 타입 내로잉을 사용한다.
- API 데이터 타입 인터페이스는 `readonly` 속성을 사용해야 한다(MUST).

### 테스트 요건

- 테스트 러너: jsdom 환경의 Vitest.
- 테스트 구조: `tests/` 아래 소스 경로를 미러링
  (예: `lib/chat/orchestrator.ts` -> `tests/lib/chat/orchestrator.test.ts`).
- 테스트는 `vitest.config.ts`에 구성된 `@/` 경로 별칭을 사용해야 한다(MUST).
- 외부 의존성은 전역 모듈 목이 아닌 의존성 주입 인터페이스를 통해 목킹해야 한다(MUST).
- `npm run test:run`은 메인 병합 전 실패 없이 통과해야 한다(MUST).

### 코드 조직

- `app/`: Next.js 페이지, 컴포넌트(도메인별: `chat/`, `common/`, `law/`), 훅, API 라우트.
- `lib/`: 프레임워크 비의존 비즈니스 로직 -- `chat/`, `law/`, `zai/`, `mcp/`, `utils/`.
- 공유 상수는 서버와 클라이언트 코드 모두에서 임포트 가능하도록
  `lib/constants.ts`에 위치해야 한다(MUST).

### SSE 스트리밍 프로토콜

- 채팅 API는 `text/event-stream`을 `Cache-Control: no-cache`,
  `Connection: keep-alive`와 함께 반환해야 한다(MUST).
- SSE 이벤트 타입: `tool_call`, `tool_result`, `content`, `error`, `done`.
- `done` 이벤트는 모든 스트림의 마지막 이벤트여야 한다(MUST).
- 스트림 오류는 `error` 이벤트로 발행한 후 종료해야 하며,
  불완전한 상태로 방치해서는 안 된다(MUST NOT).

### 커밋 규칙

- 커밋 메시지는 한국어로 작성해야 한다(MUST).
- 접두사: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

### 배포

- 대상 플랫폼: Vercel 서버리스.
- 서버 측 세션 저장을 활성화해서는 안 된다(MUST NOT).
- `npm run build`는 경고 없이 성공해야 한다(MUST).

## Governance

1. **헌법 우선**: 이 헌법은 모든 임시 결정에 우선한다. 핵심 원칙에 모순되는
   코드 변경은 공식 헌법 수정안을 동반해야 한다(MUST).

2. **수정 절차**: 핵심 원칙 수정에는 다음이 필요하다:
   (a) 현행 원칙이 불충분한 이유를 설명하는 서면 근거,
   (b) 기존 코드 및 테스트에 대한 영향 분석,
   (c) `constitution:` 접두사가 포함된 커밋 메시지로 문서화된 명시적 승인.

3. **준수 검증**: 모든 풀 리퀘스트는 병합 전 다음 체크리스트를 검증해야 한다(MUST):
   - 법률 면책 고지가 3단계 모두에서 유지됨
   - 하드코딩된 API 키 또는 PII 저장이 도입되지 않음
   - `npm run test:run` 전체 통과
   - `tsc` strict 모드에서 오류 없음
   - 새 외부 API 통합에 타임아웃 처리 포함
   - 새 기능에 해당 테스트 커버리지 포함
   - SSE 스트림이 항상 `done` 이벤트로 종료

4. **법률 도메인 리뷰**: 시스템 프롬프트(`lib/chat/system-prompt.ts`),
   도구 정의(`lib/zai/tools-schema.ts`), 출처 추출 로직(`orchestrator.ts`의
   `extractSources`)에 대한 변경은 법률 정보 정확성과 인용 무결성에 직접 영향을
   미치므로 강화된 리뷰를 **요구한다(MUST)**.

5. **버전 추적**: 헌법 버전은 시맨틱 버전(MAJOR.MINOR.PATCH)을 따른다.
   MAJOR: 핵심 원칙 추가/제거/재정의. MINOR: 섹션 추가/확장.
   PATCH: 문구 수정, 오타, 비의미적 개선.

**Version**: 1.0.0 | **Ratified**: 2026-04-08 | **Last Amended**: 2026-04-08
