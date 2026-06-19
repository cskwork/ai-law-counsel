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

## Escalations / Notes

(작성 중 — 게이트 실패·서킷브레이커 발생 시 여기 기록)
