# Tasks: Market-Driven Enhancements

**Input**: Design documents from `/specs/001-market-driven-enhancements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md

**Tests**: TDD 접근 -- 테스트를 먼저 작성하고 실패를 확인한 후 구현합니다.

**Organization**: User Story 기준으로 그룹화. 각 스토리는 독립적으로 구현 및 테스트 가능.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 소속 User Story (US1, US2, US3)
- 모든 태스크에 정확한 파일 경로 포함

## User Story Mapping

| Story | Spec Priority | 제목 | 핵심 가치 |
|-------|---------------|------|-----------|
| US1 | P1 | 문서 분석 & 계약 검토 | PDF/DOCX 업로드 -> AI 분석 |
| US2 | P4 | 인터랙티브 인용 | 클릭 가능한 법률 인용 |
| US3 | P2 | 법률 문서 템플릿 | 채팅 기반 5종 문서 생성 |

---

## Phase 1: Setup (공유 인프라)

**Purpose**: 새 의존성 설치 및 공유 상수/타입 정의

- [ ] T001 `npm install pdf-parse mammoth` 실행하여 새 의존성 설치
- [ ] T002 [P] 새 상수 추가 in `lib/constants.ts` -- MAX_FILE_SIZE (4500000), SUPPORTED_FILE_TYPES (["pdf", "docx", "txt"]), MAX_EXTRACTED_TEXT_LENGTH (50000)
- [ ] T003 [P] Citation 확장 타입 정의 in `lib/citation/types.ts` -- Source 확장: fullText, externalUrl, verified, articleNumber 필드

---

## Phase 2: Foundational (차단 전제조건)

**Purpose**: 모든 User Story에 필요한 핵심 인프라. 이 단계 완료 전 US 작업 불가.

**CRITICAL**: 이 단계의 모든 태스크가 완료되어야 User Story 구현 시작 가능.

### 테스트 (RED 단계)

- [ ] T004 [P] 문서 검증기 단위 테스트 작성 in `tests/lib/document/validator.test.ts` -- 파일 형식 검증, 크기 제한, 빈 파일, 지원하지 않는 형식 케이스. 실패 확인.
- [ ] T005 [P] 문서 추출기 단위 테스트 작성 in `tests/lib/document/extractor.test.ts` -- PDF 텍스트 추출, DOCX 텍스트 추출, TXT 직접 읽기, 추출 실패 케이스. 실패 확인.
- [ ] T006 [P] 인용 URL 빌더 단위 테스트 작성 in `tests/lib/citation/builder.test.ts` -- law.go.kr URL 생성, 법령/판례/행정규칙 타입별 URL, 조문 번호 딥링크. 실패 확인.

### 구현 (GREEN 단계)

- [ ] T007 [P] 문서 검증기 구현 in `lib/document/validator.ts` -- validateFileType(), validateFileSize(), validateFile() 함수. DI 패턴 적용. T004 테스트 통과 확인.
- [ ] T008 [P] 문서 추출기 구현 in `lib/document/extractor.ts` -- extractFromPdf(), extractFromDocx(), extractFromTxt(), extractText() 디스패처. DI 패턴: pdf-parse/mammoth를 주입 가능하게. T005 테스트 통과 확인.
- [ ] T009 [P] 인용 URL 빌더 구현 in `lib/citation/builder.ts` -- buildStatuteUrl(), buildPrecedentUrl(), buildExternalUrl(). law.go.kr URL 패턴 매핑. T006 테스트 통과 확인.

**Checkpoint**: 기반 모듈 (validator, extractor, citation builder) 테스트 전부 통과. `npm run test:run` 성공.

---

## Phase 3: User Story 1 - 문서 분석 & 계약 검토 (Priority: P1) -- MVP

**Goal**: 사용자가 PDF/DOCX/TXT 법률 문서를 업로드하면, AI가 핵심 조항, 위험 요소, 관련 법률을 구조화하여 분석 결과를 제공한다.

**Independent Test**: 샘플 임대차 계약서 PDF를 업로드하고, 구조화된 분석 결과(위험 플래그 + 법령 인용)가 60초 이내에 반환되는지 확인.

### 테스트 (RED 단계)

- [ ] T010 [P] [US1] 업로드 API 계약 테스트 작성 in `tests/app/api/upload.test.ts` -- POST /api/upload: 정상 PDF 업로드 200, DOCX 업로드 200, 미지원 형식 400, 크기 초과 413, 빈 파일 400 응답 검증. 실패 확인.
- [ ] T011 [P] [US1] 채팅 API documentContext 검증 테스트 작성 in `tests/app/api/chat-document.test.ts` -- documentContext 포함 메시지 검증: extractedText 길이 제한, 필수 필드 검증. 실패 확인.

### 구현 (GREEN 단계)

- [ ] T012 [US1] 업로드 API 라우트 구현 in `app/api/upload/route.ts` -- formData 파싱, validator + extractor 호출, 추출된 텍스트 반환. 파일 서버 미저장 (원칙 V). T010 테스트 통과 확인.
- [ ] T013 [US1] 채팅 API 라우트 확장 in `app/api/chat/route.ts` -- documentContext 필드 검증 로직 추가: extractedText 최대 50,000자, 필수 필드 확인. T011 테스트 통과 확인.
- [ ] T014 [P] [US1] FileUpload 컴포넌트 생성 in `app/components/chat/FileUpload.tsx` -- 파일 선택 버튼 + 드래그 앤 드롭 영역, 클라이언트 측 형식/크기 사전 검증, 업로드 진행 표시, 한국어 오류 메시지.
- [ ] T015 [US1] ChatContainer 확장 in `app/components/chat/ChatContainer.tsx` -- FileUpload 통합: 업로드 완료 시 추출 텍스트를 documentContext로 메시지에 첨부, 문서 분석 대화 시작 플로우.
- [ ] T016 [US1] 시스템 프롬프트 확장 in `lib/chat/system-prompt.ts` -- 문서 분석 모드 지시문 추가: documentContext 존재 시 구조화된 분석(핵심 조항, 위험 플래그, 관련 법률 인용) 수행 지시.
- [ ] T017 [US1] 대화 이력 훅 확장 in `app/hooks/useConversationHistory.ts` -- Conversation 타입에 `type` 필드 추가 ("chat" | "document-analysis" | "template-generation"), 기존 대화는 "chat" 기본값.
- [ ] T018 [US1] 면책 고지 확장 in `app/components/common/Disclaimer.tsx` -- 문서 분석 결과에 추가 면책: "문서 분석 결과는 참고용이며, 법적 효력이 없습니다" (원칙 II).
- [ ] T019 [US1] US1 통합 검증 -- 실제 PDF 업로드 -> 텍스트 추출 -> LLM 분석 -> 스트리밍 응답 -> 출처 인용 포함 확인. `npm run test:run` 전체 통과 확인.

**Checkpoint**: 문서 업로드 & 분석 완전 동작. PDF/DOCX/TXT 업로드 후 구조화된 분석 결과 반환. 독립 테스트 가능.

---

## Phase 4: User Story 2 - 인터랙티브 인용 (Priority: P4)

**Goal**: AI 응답의 법률 인용을 클릭하면, 해당 조문 전문과 law.go.kr 외부 링크를 인라인으로 표시하여 신뢰도를 높인다.

**Independent Test**: 법률 질문 후 응답의 인용 마커를 클릭하여 조문 전문이 표시되고, law.go.kr 링크가 올바른 페이지로 이동하는지 확인.

### 테스트 (RED 단계)

- [ ] T020 [P] [US2] 인용 API 계약 테스트 작성 in `tests/app/api/citation.test.ts` -- GET /api/citation: 법령 인용 200, 판례 인용 200, 미존재 인용 404, 외부 API 장애 503 응답 검증. 실패 확인.

### 구현 (GREEN 단계)

- [ ] T021 [US2] 인용 API 라우트 구현 in `app/api/citation/route.ts` -- query params (type, id, article) 파싱, MCP를 통해 조문 전문 조회, law.go.kr URL 생성 (builder 활용), 타임아웃 처리. T020 테스트 통과 확인.
- [ ] T022 [P] [US2] CitationCard 컴포넌트 생성 in `app/components/chat/CitationCard.tsx` -- 인라인 인용 마커 렌더링, 클릭 시 확장/축소 카드 (조문 전문 + 외부 링크), 로딩/에러 상태, "검증 대기 중" 표시.
- [ ] T023 [US2] MessageBubble 확장 in `app/components/chat/MessageBubble.tsx` -- react-markdown components prop에 커스텀 `a` 렌더러 추가: `cite:` 프로토콜 감지 시 CitationCard 렌더링, 일반 링크는 기존 동작 유지.
- [ ] T024 [US2] 시스템 프롬프트 확장 in `lib/chat/system-prompt.ts` -- 인용 형식 지시문 추가: 법령 인용 시 `[법령명 제N조](cite:statute/{법령ID}/{조번호})` 형식 사용 지시.
- [ ] T025 [US2] 오케스트레이터 확장 in `lib/chat/orchestrator.ts` -- extractSources에서 Citation 확장 타입 (externalUrl, verified, articleNumber) 생성, deduplicateSources 호환 유지.
- [ ] T026 [US2] US2 통합 검증 -- 법률 질문 -> 응답에 cite: 링크 포함 -> 클릭 시 조문 전문 표시 -> law.go.kr 링크 동작 확인. `npm run test:run` 전체 통과 확인.

**Checkpoint**: 인터랙티브 인용 완전 동작. 모든 법률 응답에서 인용 클릭 가능. US1과 독립적으로 테스트 가능.

---

## Phase 5: User Story 3 - 법률 문서 템플릿 (Priority: P2)

**Goal**: 사용자가 채팅으로 법률 문서 유형을 선택하면, AI가 필요 정보를 대화형으로 수집하고 완성된 법률 문서를 생성한다. 5종 템플릿 지원.

**Independent Test**: "임대차 계약서 작성해줘"라고 입력 후, AI가 필요 항목을 순차 질문하고, 모든 정보 입력 후 법적으로 유효한 계약서 Markdown이 생성되는지 확인.

### 테스트 (RED 단계)

- [ ] T027 [P] [US3] 템플릿 타입 단위 테스트 작성 in `tests/lib/chat/template-types.test.ts` -- 5종 템플릿 타입 유효성, 필수 필드 정의 검증, 잘못된 템플릿 타입 거부. 실패 확인.

### 구현 (GREEN 단계)

- [ ] T028 [US3] 템플릿 타입 정의 in `lib/chat/template-types.ts` -- 5종 템플릿 (lease, employment, demand-letter, power-of-attorney, nda), 각 템플릿의 필수 필드 목록, 관련 법률 근거. T027 테스트 통과 확인.
- [ ] T029 [US3] 시스템 프롬프트 확장 in `lib/chat/system-prompt.ts` -- 템플릿 생성 모드 지시문: 사용자가 문서 생성 요청 시 가이드 모드로 전환, 필수 필드를 한국어로 순차 질문, 완성 시 법률 문서 Markdown 생성.
- [ ] T030 [P] [US3] 문서 다운로드 기능 구현 in `app/components/chat/DocumentDownload.tsx` -- 생성된 Markdown을 .txt 파일로 다운로드 + 클립보드 복사 기능. 어시스턴트 메시지에 다운로드 버튼 표시.
- [ ] T031 [US3] 제안 질문 확장 in `app/page.tsx` -- 기존 제안 질문에 템플릿 관련 항목 추가: "임대차 계약서 작성", "근로계약서 작성", "내용증명 작성" 등.
- [ ] T032 [US3] US3 통합 검증 -- "임대차 계약서 작성해줘" 입력 -> 가이드 질문 수령 -> 정보 입력 -> 문서 생성 -> 다운로드 확인. `npm run test:run` 전체 통과 확인.

**Checkpoint**: 법률 문서 템플릿 완전 동작. 5종 문서 생성 가능. US1/US2와 독립적으로 테스트 가능.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 기능 통합 검증 및 품질 개선

- [ ] T033 [P] 크로스 스토리 E2E 검증 -- 문서 업로드 분석(US1) + 인용 클릭(US2) + 템플릿 생성(US3) 복합 시나리오 테스트
- [ ] T034 [P] 대형 문서 텍스트 청킹 최적화 in `lib/document/extractor.ts` -- LLM 컨텍스트 윈도우 초과 시 섹션별 분석 전략 구현
- [ ] T035 [P] 변경 이력 기록 in `docs/changelog/changelog-2026-04-08.md`
- [ ] T036 quickstart.md 검증 -- 모든 가이드 단계가 실제 동작하는지 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 -- 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 시작 -- 모든 US를 차단
- **US1 (Phase 3)**: Foundational 완료 후 시작 -- 다른 US와 독립
- **US2 (Phase 4)**: Foundational 완료 후 시작 -- US1과 독립
- **US3 (Phase 5)**: Foundational 완료 후 시작 -- US1/US2와 독립
- **Polish (Phase 6)**: 모든 US 완료 후 시작

### User Story Dependencies

- **US1 (문서 분석)**: Foundational 완료 후 즉시 시작 가능. 다른 US에 의존하지 않음.
- **US2 (인터랙티브 인용)**: Foundational 완료 후 즉시 시작 가능. US1과 독립적이나, US1과 함께 사용 시 시너지 (분석 결과의 인용도 클릭 가능).
- **US3 (문서 템플릿)**: Foundational 완료 후 즉시 시작 가능. US1/US2와 완전 독립.

### Within Each User Story

- 테스트(RED) -> 구현(GREEN) -> 통합 검증 순서
- 모델/타입 -> 서비스/유틸리티 -> API 라우트 -> UI 컴포넌트 순서
- 시스템 프롬프트 수정은 해당 스토리 구현 후반부

### Parallel Opportunities

```
Phase 2 (Foundational) 내부:
  T004 || T005 || T006  (테스트 3개 병렬)
  T007 || T008 || T009  (구현 3개 병렬)

Phase 3-5 (User Stories) 간:
  US1 || US2 || US3  (3개 스토리 병렬 가능)

Phase 3 (US1) 내부:
  T010 || T011  (테스트 2개 병렬)
  T014 || T017  (FileUpload + 대화이력훅 병렬)
```

---

## Parallel Example: User Story 1

```bash
# RED 단계 -- 테스트를 먼저 작성하고 실패 확인:
Task: "업로드 API 계약 테스트 작성 in tests/app/api/upload.test.ts"         # T010
Task: "채팅 API documentContext 검증 테스트 작성 in tests/app/api/chat-document.test.ts"  # T011

# GREEN 단계 -- 구현 (독립 파일은 병렬):
Task: "FileUpload 컴포넌트 생성 in app/components/chat/FileUpload.tsx"     # T014
Task: "대화 이력 훅 확장 in app/hooks/useConversationHistory.ts"            # T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 완료: Setup (의존성 설치)
2. Phase 2 완료: Foundational (validator, extractor, citation builder)
3. Phase 3 완료: US1 (문서 업로드 & 분석)
4. **STOP and VALIDATE**: PDF 업로드 -> 분석 결과 확인
5. 배포/데모 가능 상태

### Incremental Delivery

1. Setup + Foundational -> 기반 완료
2. US1 추가 -> 문서 분석 동작 -> 배포 (MVP!)
3. US2 추가 -> 인터랙티브 인용 동작 -> 배포 (신뢰도 향상)
4. US3 추가 -> 문서 템플릿 동작 -> 배포 (기능 완성)
5. 각 스토리가 이전 스토리를 깨뜨리지 않고 가치를 추가

### Single Developer Strategy (권장)

1. Phase 1 + Phase 2 완료 (기반)
2. US1 (MVP) -> 검증 -> 배포
3. US2 (인용) -> 검증 -> 배포
4. US3 (템플릿) -> 검증 -> 배포
5. Polish -> 최종 배포

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음
- [Story] 라벨 = 소속 User Story 추적
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 테스트 실패를 먼저 확인한 후 구현 (TDD)
- 태스크 또는 논리적 그룹 단위로 커밋
- 체크포인트에서 정지하여 독립적으로 스토리 검증 가능
- 서버에 파일/PII 저장 금지 (헌법 원칙 V)
- 모든 UI/메시지 한국어 (헌법 원칙 VII)
