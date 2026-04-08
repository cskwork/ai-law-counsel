# Implementation Plan: Market-Driven Enhancements

**Branch**: `001-market-driven-enhancements` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-market-driven-enhancements/spec.md`

## Summary

시장 조사 기반으로 앱의 인기를 높이기 위한 3대 핵심 기능을 구현한다:
1. **문서 분석 & 계약 검토** (P1) -- PDF/DOCX 업로드 후 AI가 위험 조항과 관련 법률을 분석
2. **법률 문서 템플릿** (P2) -- 채팅 기반 가이드 작성으로 5종 법률 문서 생성
3. **인터랙티브 인용** (P4) -- 클릭 가능한 법률 인용으로 신뢰도 향상

결제 기능과 Firebase/사용자 계정은 시장 점유율 확보 후 2차 단계에서 구현.
현재 아키텍처(Next.js 14 + localStorage + 무상태 서버리스) 유지.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 18+
**Primary Dependencies**: Next.js 14, React 18, react-markdown, remark-gfm, pdf-parse (NEW), mammoth (NEW)
**Storage**: localStorage (클라이언트 측, 기존 유지)
**Testing**: Vitest + jsdom (기존 58 테스트 케이스 확장)
**Target Platform**: Vercel 서버리스 (Hobby tier)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: 문서 분석 90초 이내 (20페이지 기준), 인용 로드 2초 이내
**Constraints**: Vercel payload 4.5MB, 실행시간 60초, localStorage ~5-10MB
**Scale/Scope**: 초기 1,000 MAU 목표, 한국어 전용

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check: PASS

| 원칙 | 상태 | 근거 |
|------|------|------|
| I. 근거 기반 답변 | PASS | 인용 기능 강화로 출처 인용 개선 |
| II. 법률 면책 고지 | PASS | 문서 분석/템플릿에 면책 고지 추가 (FR-009) |
| III. 정부 데이터 무결성 | PASS | law.go.kr 데이터 원본 표시 유지 |
| IV. 제한된 자율 도구 사용 | PASS | 기존 오케스트레이터 루프 내 동작 |
| V. 무상태 서버리스 | PASS | Firebase 제외. 파일은 메모리에서만 처리 후 폐기 |
| VI. 테스트 용이성 DI | PASS | 새 모듈도 DI 패턴 적용 |
| VII. 한국어 우선 UX | PASS | 모든 신규 UI/메시지 한국어 |

### Post-Design Check: PASS

모든 게이트 통과. 헌법 수정 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/001-market-driven-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0 output (완료)
├── data-model.md        # Phase 1 output (완료)
├── quickstart.md        # Phase 1 output (완료)
├── contracts/
│   └── api-contracts.md # Phase 1 output (완료)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── chat/route.ts              # [MODIFY] documentContext 검증
│   ├── upload/route.ts            # [NEW] 문서 업로드 엔드포인트
│   └── citation/route.ts          # [NEW] 인용 전문 조회
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx      # [MODIFY] 파일 업로드 통합
│   │   ├── MessageBubble.tsx      # [MODIFY] 인용 커스텀 렌더러
│   │   ├── FileUpload.tsx         # [NEW] 파일 업로드 UI
│   │   └── CitationCard.tsx       # [NEW] 인터랙티브 인용 카드
│   └── common/
│       └── Disclaimer.tsx         # [MODIFY] 문서 분석 면책 추가
├── hooks/
│   └── useConversationHistory.ts  # [MODIFY] 대화 타입 필드 추가
└── page.tsx                       # [MODIFY] 파일 업로드 진입점

lib/
├── chat/
│   ├── system-prompt.ts           # [MODIFY] 인용 형식 + 템플릿 모드
│   ├── orchestrator.ts            # [MODIFY] Citation 확장
│   └── template-types.ts          # [NEW] 템플릿 타입 정의
├── document/
│   ├── extractor.ts               # [NEW] PDF/DOCX 텍스트 추출
│   └── validator.ts               # [NEW] 파일 검증 (크기/형식)
├── citation/
│   ├── builder.ts                 # [NEW] law.go.kr URL 생성
│   └── types.ts                   # [NEW] Citation 확장 타입
└── constants.ts                   # [MODIFY] 새 상수 추가

tests/
├── lib/document/
│   ├── extractor.test.ts          # [NEW]
│   └── validator.test.ts          # [NEW]
├── lib/citation/
│   ├── builder.test.ts            # [NEW]
│   └── types.test.ts              # [NEW]
└── app/api/
    ├── upload.test.ts             # [NEW]
    └── citation.test.ts           # [NEW]
```

**Structure Decision**: 기존 Next.js 14 App Router 구조를 유지하며, `lib/document/`와 `lib/citation/` 두 개의 새 도메인 모듈을 추가한다. 기존 `lib/chat/`, `lib/law/`, `lib/mcp/` 구조와 동일한 패턴.

## Implementation Phases

### Phase A: 문서 업로드 & 텍스트 추출 (P1 기반) -- 예상 11개 태스크

1. `lib/document/validator.ts` -- 파일 형식/크기 검증 유틸리티 + 테스트
2. `lib/document/extractor.ts` -- pdf-parse/mammoth 기반 텍스트 추출 + 테스트
3. `app/api/upload/route.ts` -- 업로드 API 엔드포인트 + 테스트
4. `app/components/chat/FileUpload.tsx` -- 파일 업로드 UI 컴포넌트
5. `ChatContainer.tsx` 수정 -- 파일 업로드 통합, documentContext 메시지 생성
6. `app/api/chat/route.ts` 수정 -- documentContext 검증 추가
7. `lib/chat/system-prompt.ts` 수정 -- 문서 분석 모드 지시문 추가
8. `useConversationHistory.ts` 수정 -- 대화 타입 필드 추가
9. 면책 고지 확장 -- 문서 분석 결과에 추가 면책 표시
10. 통합 테스트 -- 업로드 -> 추출 -> LLM 분석 -> 응답 플로우
11. E2E 검증 -- 실제 PDF 업로드 시나리오

### Phase B: 인터랙티브 인용 (P4 기반) -- 예상 8개 태스크

1. `lib/citation/types.ts` -- Citation 확장 타입 정의
2. `lib/citation/builder.ts` -- law.go.kr URL 생성 유틸리티 + 테스트
3. `app/api/citation/route.ts` -- 인용 전문 조회 API + 테스트
4. `app/components/chat/CitationCard.tsx` -- 인용 카드 컴포넌트
5. `MessageBubble.tsx` 수정 -- react-markdown 커스텀 렌더러 (`cite:` 프로토콜)
6. `lib/chat/system-prompt.ts` 수정 -- 인용 형식 지시문 (`[법령명 제N조](cite:id)`)
7. `lib/chat/orchestrator.ts` 수정 -- Citation 확장 타입 소스 추출
8. 통합 테스트 -- 질문 -> 응답 -> 인용 클릭 -> 전문 표시 플로우

### Phase C: 법률 문서 템플릿 (P2 기반) -- 예상 6개 태스크

1. `lib/chat/template-types.ts` -- 5종 템플릿 타입 및 필수 필드 정의
2. `lib/chat/system-prompt.ts` 수정 -- 템플릿 생성 모드 지시문
3. 문서 다운로드 기능 -- 생성된 Markdown을 텍스트 파일로 내보내기
4. 대화 UI 확장 -- 템플릿 선택 시작점 (제안 질문 확장)
5. 통합 테스트 -- 템플릿 요청 -> 가이드 질문 -> 문서 생성 플로우
6. E2E 검증 -- 임대차 계약서 생성 시나리오

## Complexity Tracking

> 헌법 위반 없음. 복잡성 정당화 불필요.

## Risk & Mitigation

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| Vercel 4.5MB 제한으로 대형 PDF 업로드 불가 | P1 기능 제한 | 클라이언트 측 사전 크기 검증 + 명확한 오류 메시지 |
| LLM 컨텍스트 윈도우 초과 (긴 문서) | 분석 품질 저하 | 텍스트 청킹 + 섹션별 분석 전략 |
| law.go.kr API 응답 지연/장애 | 인용 기능 중단 | 타임아웃 + 검증 실패 시 "검증 대기 중" 표시 |
| 시스템 프롬프트 복잡도 증가 | 응답 품질 저하 | 모드별 프롬프트 분리, A/B 테스트 |
| localStorage 용량 초과 (문서 분석 이력) | 데이터 손실 | 분석 후 원문 텍스트를 요약으로 대체 |

## Next Steps

- `/speckit.tasks` -- 태스크 분해 및 실행 순서 결정
- 이후 TDD 워크플로우로 Phase A부터 구현 시작
