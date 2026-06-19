# Run: 2026-06-20 Feature Improvements (Trust / UX / Doc / Quality)

/ supergoal LEGACY 모드. 운영 중인 ai-law-counsel(Vercel)에 4개 테마의 외과적 개선을 추가하고 Production 배포.

## Objective

"workflow further spec to add/improve/update features and ultracode to implement, deploy to attached Vercel and check."

사용자 승인 범위(AskUserQuestion): 4개 테마 전부 + 바로 Production 배포.

## Priority Rules (도메인: 한국 법률 정보 서비스 / Next.js 서버리스)

1. 근거 기반 — 법령/판례 출처 날조 금지. 인용 무결성 변경은 강화 리뷰.
2. 면책 3단계(배너/프롬프트/문서) 절대 약화 금지. 긴급 핫라인은 표시 의무(MUST).
3. 무상태 서버리스 — 서버에 PII/대화 저장 금지. localStorage 전용.
4. 한국어 우선 — 모든 UI/오류/테스트 설명 한국어.
5. DI 테스트 용이성 — 외부 의존성은 주입 가능 인터페이스. 새 기능엔 테스트 동반.
6. TypeScript strict — `any` 금지(외부데이터는 `unknown`+내로잉), 공개 API 명시 타입, readonly.
7. 외부 API 안전 — 모든 fetch에 타임아웃. SSE는 항상 `done`으로 종료.
8. 의존성 최소주의 — 새 prod 의존성 추가 금지(이번 작업은 0개 신규 의존성).
9. 변경 surgical — 4개 테마를 비중복 파일 단위로 분리, 무관 코드 리팩터 금지.
10. 빌드 무경고 — `npm run build` 성공 + `npm run test:run` 전체 통과가 배포 게이트.

## Key Choices

- 빌드 토폴로지: 상호 연동 UI 파일이 많아 **비중복 파일 소유권 3유닛 병렬** + 통합/검증 단계. (theme별 병렬이 아니라 파일별 병렬 — 충돌 회피)
- 긴급 핫라인은 LLM 프롬프트 의존을 끊고 **결정론적 UI 컴포넌트**로 상시 노출(헌법 II 강화). 기존 프롬프트 지시문은 유지.
- 0개 신규 prod 의존성. 기존 스택만 사용.
- 배포: feature 브랜치 → `npm run build`/test 게이트 → `vercel --prod`.

## Outcome

- 게이트 전부 통과: `tsc` 0 / `lint` 0 / `test:run` 224 통과 / `build` 무경고.
- 리뷰 패널(security/typescript/code-quality) 전원 approved, CRITICAL/HIGH 0. MEDIUM 권고 4건 반영(DRY 헬퍼, onSend 타입, 재시도 상한, citation detail 제거).
- 배포: `vercel --prod` → Production `https://ai-law-counsel.vercel.app` (별칭), 빌드 `https://ai-law-counsel-likmyjjpz-agentic-era.vercel.app`.
- 라이브 검증: 홈 200, `/api/citation`(파라미터 누락) 400, 배포 JS 번들에 신규 기능 문자열 확인(대한법률구조공단/132/여성긴급전화/다시 시도/문서가 길어/원문을 직접 대조). `위험도 높음`은 서버 측 시스템 프롬프트라 클라이언트 번들에 부재(정상).

## Escalations / Notes

- 서킷브레이커/게이트 실패 없음.
- main을 배포본과 동기화(ff merge + push) — Vercel GitHub 통합이 추후 main 푸시 시 프로덕션을 되돌리는 것을 방지하기 위함.
- deferred(LOW): SSE 'error' 직후 'done' 도착 시 대화 저장 가드 — 현재 서버는 해당 순서를 보내지 않아 영향 없음. 추후 가드 추가 권장.
