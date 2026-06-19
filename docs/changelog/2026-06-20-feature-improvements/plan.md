# Plan (FROZEN) — 2026-06-20 Feature Improvements

## 1. 평이한 브리프 (비개발자용)

지금 운영 중인 "AI 법률 상담" 앱에 네 가지 묶음의 개선을 더합니다.

- **신뢰**: 형사·긴급 상황에서 바로 누를 수 있는 긴급 전화(법률구조공단 132, 경찰 112 등)를 화면에 항상 보이게 합니다. 지금은 AI가 "안내하라"고만 되어 있어 안 나올 수 있는데, 이를 화면 고정 요소로 바꿉니다. 또 법령 인용을 펼쳤을 때 "AI 요약과 공식 원문을 직접 대조하세요"라는 안내를 넣어 신뢰를 높입니다.
- **사용성**: 답변 도중 오류가 나면 지금은 그냥 오류 메시지만 뜨는데, **"다시 시도" 버튼**을 추가해 한 번에 재요청할 수 있게 합니다. 문서 업로드 영역을 키보드로도 쓸 수 있게 하고, 추천 질문을 보기 좋게 분류합니다.
- **문서 분석**: 아주 긴 문서를 올리면 일부만 분석되는데, 지금은 그 사실을 알려주지 않습니다. "문서가 길어 앞부분만 분석했다"는 안내를 표시하고, 위험 요소에 "위험도 높음/중간/낮음" 표시를 더합니다.
- **품질**: 설명서(README)의 잘못된 숫자(도구 호출 5회 → 실제 10회)를 바로잡고, 외부 법령 API가 일시적으로 실패할 때만 재시도하도록 다듬습니다.

위험: 낮음. 새로운 서버·로그인·결제 기능은 없고, 기존 화면을 다듬는 수준입니다. 모든 변경에는 자동 테스트가 따라붙고, 전체 테스트 통과 후에만 배포합니다.

## 2. 기술 브리프 (신입 개발자용)

Next.js 14 App Router + TS strict. 0개 신규 prod 의존성. 변경을 **비중복 파일 소유권 3유닛**으로 분리해 병렬 구현 후 통합·검증.

### Unit 1 — lib + API + docs (백엔드/문서)

| 파일 | 변경 |
|---|---|
| `lib/document/extractor.ts` | `extractTextWithMeta(buffer, fileType, deps, maxLength)` 추가 → `{ text, truncated, originalLength, usedLength }` 반환. 기존 `extractText`/`chunkText`는 보존(하위호환). |
| `app/api/upload/route.ts` | 추출 시 maxLength 적용 + 응답 `data`에 `truncated: boolean`, `originalTextLength: number` 추가. 기존 필드 유지. |
| `lib/chat/system-prompt.ts` | 문서 분석 모드의 위험 플래그를 텍스트 심각도 마커로 구조화: `**[위험도 높음]**`/`[위험도 중간]`/`[위험도 낮음]`. **이모지 금지**(레포 규칙). 다른 섹션 불변. |
| `lib/law/client.ts` | `fetchAndParse` 재시도 정교화: 4xx(클라이언트 오류)는 재시도 금지, 네트워크/abort/5xx만 재시도, 시도 간 300ms 백오프. 타임아웃/2시도 상한 유지. |
| `README.md` | "up to 5 rounds" → "up to 10 rounds", "Max tool-calling rounds per response: 5" → "10" (코드 `MAX_TOOL_ROUNDS=10` 및 헌법 IV와 일치). |
| 테스트 | `tests/lib/document/extractor.test.ts`(meta/truncated 케이스), `tests/lib/law/client.test.ts`(4xx 미재시도·5xx/네트워크 재시도), `tests/app/api/upload.test.ts`(truncated 응답). |

### Unit 2 — common + citation 컴포넌트

| 파일 | 변경 |
|---|---|
| `app/components/common/EmergencyContacts.tsx` (신규) | 긴급 연락처 4종을 `tel:` 링크로 렌더. `대한법률구조공단 132`, `경찰 112`, `여성긴급전화 1366`, `정신건강/자살예방 109`. `role`, `aria-label`, 키보드 포커스 가능. 한국어. |
| `app/components/common/Disclaimer.tsx` | `role="note"` + `aria-label` 추가(접근성). 문구·3단계 면책 불변. |
| `app/components/chat/CitationCard.tsx` | 펼침 시 안내문 추가: "AI 요약과 아래 공식 원문을 직접 대조하세요." `검증 대기 중`에 아이콘+`title` 보강. 기존 fetch/검증 로직 불변. |
| 테스트 | `tests/app/components/common/EmergencyContacts.test.tsx`(신규: 4종 번호+tel 링크+a11y), `tests/app/components/chat/CitationCard.test.tsx`(안내문 노출). |

### Unit 3 — chat 컨테이너 + page (UI 흐름)

| 파일 | 변경 |
|---|---|
| `app/components/chat/ChatContainer.tsx` | (1) 스트림 오류/네트워크 실패 시 마지막 `{userMessage, document}`를 `lastAttempt` 상태로 보관, **재시도 버튼** 렌더 → 클릭 시 재전송. (2) 빈 상태(empty state)에 `<EmergencyContacts />` 렌더. (3) `SUGGESTED_QUESTIONS`를 카테고리(상담/문서 작성)로 그룹화. (4) 업로드 완료 알림에 `truncated`면 "문서가 길어 앞부분만 분석합니다" 안내 추가. |
| `app/components/chat/FileUpload.tsx` | 드롭존을 `role="button"`, `tabIndex=0`, `aria-label`, Enter/Space로 클릭 트리거. `aria-busy` 추가. `UploadResult`에 `truncated?: boolean`, `originalTextLength?: number` 추가. |
| `app/page.tsx` | 헤더 A-/A+ 버튼에 `aria-label` 추가(현재 `title`만). 사이드바 토글 `aria-label`. 최소 변경. |
| 테스트 | `tests/app/components/chat/ChatContainer.test.tsx`(신규: 오류 시 재시도 버튼·재전송), `tests/app/components/chat/FileUpload.test.tsx`(신규: 키보드 접근). |

### Cross-unit 계약 (반드시 일치)

- Upload API 응답 `data`: 기존 필드 + `truncated: boolean`, `originalTextLength: number`. (Unit 1 생산, Unit 3 소비)
- `UploadResult`(FileUpload.tsx): `truncated?: boolean`, `originalTextLength?: number` 추가. (Unit 3 단독)
- `lib/document/context.ts`는 **건드리지 않음**(notice는 UploadResult로 충분).

### 불변 보장 (헌법)

면책 3단계 유지, PII 미저장, 한국어, DI, SSE `done` 종료, `any` 금지, readonly, 타임아웃 유지. `npm run build` 무경고 + `npm run test:run` 전체 통과.

## 3. claims (run-to-prove → verification.md에서 재실행)

- C1: `npx tsc --noEmit` → 오류 0
- C2: `npm run test:run` → 전체 통과(신규 테스트 포함, 기존 223 케이스 깨짐 없음)
- C3: `npm run build` → 무경고 성공
- C4: `npm run lint` → 오류 0
- C5: `EmergencyContacts`가 132/112/1366/109를 `tel:` 링크로 렌더(테스트로 증명)
- C6: ChatContainer 오류 시 재시도 버튼 노출 + 재전송(테스트로 증명)
- C7: `law/client` 4xx 미재시도 / 5xx·네트워크 재시도(테스트로 증명)
- C8: upload 응답에 `truncated`/`originalTextLength` 포함(테스트로 증명)
- C9: README round count = 10 (grep로 5 잔존 없음)

## 4. Human Feedback

scope(4테마 전부) + 배포(바로 Production) 사용자 승인 완료(AskUserQuestion, 2026-06-20). 본 plan은 동결.
