# Research: Market-Driven Enhancements

**Branch**: `001-market-driven-enhancements` | **Date**: 2026-04-08

## Scope Adjustments (User Directives)

- **결제 기능 제외**: 시장 점유율 확보 우선. 모든 기능 무료 제공.
- **Firebase 제외**: 나중으로 연기. 현재 localStorage 기반 아키텍처 유지.
- **P3 (계정/클라우드 동기화) 제외**: Firebase 필요하므로 연기.
- **P5 (프리미엄 모델) 제외**: 결제 필요하므로 연기.

**최종 스코프**: P1 (문서 분석), P2 (문서 템플릿), P4 (인터랙티브 인용)

---

## R1: 문서 업로드 및 텍스트 추출

### Decision
서버 측에서 `pdf-parse` + `mammoth`를 사용하여 PDF/DOCX 텍스트를 추출한다.

### Rationale
- `pdf-parse`: 순수 JS, 네이티브 바이너리 불필요. Vercel 서버리스 호환. 간단한 API (`pdf(buffer).then(data => data.text)`).
- `mammoth`: 순수 JS, `.docx`에서 텍스트/HTML 추출. 서버리스 호환.
- 서버 측 추출이 법률 문서에 적합: 일관된 결과, 클라이언트 리소스 비의존.

### Alternatives Considered
- `pdfjs-dist`: 더 무겁고 Node.js에서 `--legacy-build` 필요. 클라이언트 렌더링에 적합.
- `pdf2json`, `poppler`: 네이티브 바이너리 필요, Vercel 비호환. 기각.
- 클라이언트 측 추출: 브라우저 환경 차이로 법률 문서의 정확한 텍스트 추출 보장 불가.

### Constraints
- Vercel payload 제한: 4.5MB. 이를 초과하는 파일은 클라이언트 측에서 사전 검증 후 거부.
- Vercel 실행 시간: Hobby 60초, Pro 300초. 일반 법률 문서(20페이지 이하) 추출은 5초 미만.
- 추출된 텍스트는 LLM 컨텍스트 윈도우 제한을 고려하여 청킹 필요.

---

## R2: 인터랙티브 인용 UI 패턴

### Decision
인라인 superscript 번호 마커 `[1][2]` + 클릭 시 인라인 확장 카드 패턴을 채택한다.

### Rationale
- Perplexity 스타일 superscript가 법률 인용에 가장 자연스러움 (학술 논문과 동일한 패턴).
- 인라인 확장이 사이드 패널보다 모바일 친화적.
- `react-markdown`의 `components` prop으로 `a` 태그를 커스텀 인용 컴포넌트로 오버라이드 가능.

### Implementation Pattern
- LLM 응답에서 인용을 `[법령명 제N조](cite:statute-id)` 형식으로 생성하도록 시스템 프롬프트 조정.
- `react-markdown` 커스텀 렌더러에서 `cite:` 프로토콜 감지 후 `CitationCard` 컴포넌트 렌더링.
- 클릭 시 MCP를 통해 해당 조문 전문을 가져와 인라인으로 표시.

### law.go.kr URL 패턴
- 법령 페이지: `https://www.law.go.kr/법령/{법령명}` (URL 인코딩 필요)
- 파라미터 방식: `https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq={id}`
- 조문 딥링크: `law.go.kr/LSW/lsSideInfoP.do?lsiSeq={id}&joNo={조번호}&joBrNo=00&docCls=jo`

### Alternatives Considered
- 사이드 패널: 데스크톱에서 우수하나 모바일에서 공간 부족. 현 앱은 모바일 우선.
- 툴팁/호버: 모바일에서 호버 불가. 기각.
- shadcn AI InlineCitation 컴포넌트 참고하되, 프로젝트 의존성 최소화 원칙에 따라 자체 구현.

---

## R3: 법률 문서 템플릿 생성 전략

### Decision
채팅 기반 가이드 작성 방식을 채택한다. 별도 템플릿 UI가 아닌, 대화형으로 필드를 수집하고 LLM이 문서를 생성한다.

### Rationale
- 현재 앱의 강점인 채팅 UX를 그대로 활용 가능.
- 별도 폼 UI 구축 불필요 -- LLM이 필요한 정보를 대화형으로 질문.
- 사용자가 "임대차 계약서 작성해줘"라고 입력하면, LLM이 필요 항목을 순차적으로 질문하고 최종 문서 생성.
- 생성된 문서는 Markdown으로 렌더링 후 복사/다운로드 가능.

### Template Coverage (초기 5종)
1. **임대차 계약서**: 주택임대차보호법 기반
2. **근로계약서**: 근로기준법 기반
3. **내용증명**: 민법 기반 채권/채무 통지
4. **위임장**: 민법 기반 대리권 수여
5. **비밀유지계약서(NDA)**: 부정경쟁방지법 기반

### Implementation
- `lib/chat/system-prompt.ts`에 템플릿 생성 모드 지시문 추가.
- 사용자가 문서 생성을 요청하면 LLM이 가이드 모드로 전환.
- 생성된 문서에 관련 법률 근거를 주석으로 포함.
- 클라이언트에서 Markdown -> 복사 가능한 형식으로 변환.

### Alternatives Considered
- 별도 폼 UI + 템플릿 엔진: 개발 공수 높음, 현재 채팅 UX와 이질적. 기각.
- 외부 문서 생성 API: 의존성 증가, 무상태 원칙 위반 가능성. 기각.

---

## R4: 헌법(Constitution) 호환성 분석

### Constitution Gates -- All PASS

| 원칙 | 상태 | 근거 |
|------|------|------|
| I. 근거 기반 답변 | PASS | 문서 분석/인용 기능이 출처 인용을 더욱 강화함 |
| II. 법률 면책 고지 | PASS | FR-009에서 문서 분석/템플릿에 면책 고지 명시 |
| III. 정부 데이터 무결성 | PASS | 인용 기능이 원본 데이터 충실 표시를 강화함 |
| IV. 제한된 자율 도구 사용 | PASS | 문서 분석도 기존 오케스트레이터 루프 내에서 동작 |
| V. 무상태 서버리스 | PASS | Firebase 제외됨. localStorage 유지. 업로드 파일은 서버에서 처리 후 미저장 |
| VI. 테스트 용이성 DI | PASS | 새 기능도 DI 인터페이스를 통해 구현 |
| VII. 한국어 우선 UX | PASS | 모든 새 기능 한국어 지원 명시 (FR-010) |

### Key Decision: 업로드 파일 처리 방식
- 업로드된 파일은 서버에서 텍스트 추출 후 **즉시 폐기** (메모리에서만 처리).
- 추출된 텍스트만 LLM에 전달하고, 서버는 파일을 영속 저장하지 않음.
- 이는 원칙 V (무상태 서버리스) 및 PII 미저장 원칙과 완전히 호환됨.
- 추출된 텍스트 + 분석 결과는 클라이언트 localStorage에 대화 이력으로 저장.

---

## R5: 새 의존성 목록

| 패키지 | 용도 | 번들 영향 |
|--------|------|-----------|
| `pdf-parse` | PDF 텍스트 추출 (서버 전용) | 서버 번들만 증가 (~200KB) |
| `mammoth` | DOCX 텍스트 추출 (서버 전용) | 서버 번들만 증가 (~150KB) |

- 클라이언트 번들에 추가되는 의존성 없음.
- 헌법의 "의존성 최소주의" 원칙 준수.
