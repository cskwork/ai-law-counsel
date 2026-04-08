# Changelog 2026-04-08

## Market-Driven Enhancements (001)

### US1: 문서 분석 & 계약 검토 (P1)
- **feat**: PDF/DOCX/TXT 문서 업로드 API (`POST /api/upload`)
- **feat**: 문서 텍스트 추출기 (pdf-parse, mammoth 기반, DI 패턴)
- **feat**: 파일 형식/크기 검증기
- **feat**: FileUpload 컴포넌트 (드래그 앤 드롭 + 클릭)
- **feat**: ChatContainer에 문서 업로드 통합
- **feat**: 시스템 프롬프트에 문서 분석 모드 추가
- **feat**: 대화 타입 필드 추가 (chat/document-analysis/template-generation)
- **fix**: 면책 고지에 문서 분석 관련 문구 추가

### US2: 인터랙티브 인용 (P4)
- **feat**: Citation API (`GET /api/citation`) - MCP를 통한 조문 전문 조회
- **feat**: CitationCard 컴포넌트 (인라인 확장/축소 + law.go.kr 링크)
- **feat**: react-markdown 커스텀 `a` 렌더러 (`cite:` 프로토콜 감지)
- **feat**: 인용 URL 빌더 (법령/판례/행정규칙별 law.go.kr URL 생성)
- **feat**: 시스템 프롬프트에 인용 형식 지시문 추가
- **refactor**: 오케스트레이터 URL 생성을 citation builder로 통합

### US3: 법률 문서 템플릿 (P2)
- **feat**: 5종 법률 문서 템플릿 타입 정의 (임대차/근로/내용증명/위임장/NDA)
- **feat**: 시스템 프롬프트에 템플릿 생성 가이드 모드 추가
- **feat**: DocumentDownload 컴포넌트 (txt 다운로드 + 클립보드 복사)
- **feat**: 추천 질문에 템플릿 관련 항목 추가

### 공유 인프라
- **deps**: pdf-parse, mammoth, @types/pdf-parse 추가
- **feat**: 문서 업로드 관련 상수 (MAX_FILE_SIZE, SUPPORTED_FILE_TYPES, MAX_EXTRACTED_TEXT_LENGTH)
- **feat**: Citation 확장 타입 (fullText, externalUrl, verified, articleNumber)
- **feat**: 대형 문서 텍스트 청킹 유틸리티

### 테스트
- 신규 테스트 파일 7개, 테스트 케이스 27개 추가
- 전체: 19개 파일, 149개 테스트 통과
