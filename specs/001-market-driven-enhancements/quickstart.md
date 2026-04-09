# Quickstart: Market-Driven Enhancements

**Branch**: `001-market-driven-enhancements` | **Date**: 2026-04-08

## Prerequisites

- Node.js 18+
- npm
- 기존 환경 변수 설정 완료 (`.env.local`)

## 새 의존성 설치

```bash
npm install pdf-parse mammoth
```

## 구현 순서 (권장)

### Phase 1: 문서 업로드 & 텍스트 추출 (P1 기반)

1. **API Route 생성**: `app/api/upload/route.ts`
   - `formData` 파싱
   - `pdf-parse` / `mammoth`로 텍스트 추출
   - 파일 크기/형식 검증
   - 추출된 텍스트 반환 (파일 미저장)

2. **UI 컴포넌트**: `app/components/chat/FileUpload.tsx`
   - 파일 선택/드래그 앤 드롭
   - 업로드 진행 표시
   - 파일 형식/크기 클라이언트 사전 검증

3. **ChatContainer 확장**: 파일 업로드 시 추출된 텍스트를 메시지에 첨부

### Phase 2: 인터랙티브 인용 (P4 기반)

1. **Citation 컴포넌트**: `app/components/chat/CitationCard.tsx`
   - 인라인 인용 마커 렌더링
   - 클릭 시 조문 전문 표시
   - law.go.kr 외부 링크

2. **react-markdown 커스텀 렌더러**: `cite:` 프로토콜 감지

3. **Citation API Route**: `app/api/citation/route.ts`
   - MCP를 통해 조문 전문 가져오기
   - 검증 상태 반환

4. **시스템 프롬프트 수정**: 인용 형식 지시문 추가

### Phase 3: 법률 문서 템플릿 (P2 기반)

1. **시스템 프롬프트 확장**: 템플릿 생성 모드 지시문
   - 5종 템플릿별 필수 필드 정의
   - 가이드 질문 흐름 지시

2. **템플릿 타입 정의**: `lib/chat/template-types.ts`

3. **문서 다운로드 기능**: 생성된 Markdown을 텍스트 파일로 다운로드

## 테스트 실행

```bash
# 전체 테스트
npm run test:run

# 특정 모듈 테스트
npx vitest run tests/lib/chat/orchestrator.test.ts
```

## 주요 파일 변경 예상

```
app/
├── api/
│   ├── upload/route.ts          [NEW] 문서 업로드 엔드포인트
│   ├── citation/route.ts        [NEW] 인용 전문 조회 엔드포인트
│   └── chat/route.ts            [MODIFY] documentContext 검증 추가
├── components/
│   └── chat/
│       ├── FileUpload.tsx        [NEW] 파일 업로드 UI
│       ├── CitationCard.tsx      [NEW] 인터랙티브 인용 카드
│       ├── ChatContainer.tsx     [MODIFY] 파일 업로드 통합
│       └── MessageBubble.tsx     [MODIFY] 인용 커스텀 렌더러
lib/
├── chat/
│   ├── system-prompt.ts          [MODIFY] 인용 형식 + 템플릿 모드
│   ├── orchestrator.ts           [MODIFY] Citation 확장 타입
│   └── template-types.ts         [NEW] 템플릿 타입 정의
├── document/
│   ├── extractor.ts              [NEW] PDF/DOCX 텍스트 추출
│   └── validator.ts              [NEW] 파일 검증
└── citation/
    ├── builder.ts                [NEW] 인용 URL 생성
    └── types.ts                  [NEW] Citation 확장 타입
tests/
├── lib/document/
│   ├── extractor.test.ts         [NEW]
│   └── validator.test.ts         [NEW]
└── lib/citation/
    ├── builder.test.ts           [NEW]
    └── types.test.ts             [NEW]
```

## 헌법 준수 체크리스트

구현 중 다음을 항상 확인:
- [ ] 업로드된 파일이 서버에 저장되지 않음 (원칙 V)
- [ ] 모든 UI/오류 메시지가 한국어 (원칙 VII)
- [ ] 인용 출처가 실제 법령 데이터 기반 (원칙 I)
- [ ] 문서 분석 결과에 법률 면책 고지 포함 (원칙 II)
- [ ] 새 기능에 대한 테스트 작성 (원칙 VI)
- [ ] 외부 API 호출에 타임아웃 설정 (보안 제약사항)
