# Data Model: Market-Driven Enhancements

**Branch**: `001-market-driven-enhancements` | **Date**: 2026-04-08

> Firebase 제외, localStorage 유지 결정에 따라 모든 데이터는 클라이언트 측 저장.

## Entities

### 1. Conversation (기존 확장)

현재 `useConversationHistory.ts`의 대화 엔티티를 확장한다.

```
Conversation
├── id: string (UUID)
├── title: string (자동 생성)
├── messages: Message[]
├── createdAt: number (timestamp)
├── updatedAt: number (timestamp)
└── type: "chat" | "document-analysis" | "template-generation"  [NEW]
```

**변경점**: `type` 필드 추가로 대화 유형 구분. 기존 대화는 `"chat"`으로 기본값.

### 2. Message (기존 확장)

```
Message
├── role: "user" | "assistant"
├── content: string
├── sources: Source[]              [기존]
├── documentContext?: DocumentContext  [NEW]
└── templateContext?: TemplateContext  [NEW]
```

### 3. DocumentContext (신규)

문서 분석 대화에서 업로드된 문서의 메타데이터.

```
DocumentContext
├── fileName: string
├── fileType: "pdf" | "docx" | "txt"
├── fileSize: number (bytes)
├── extractedTextLength: number (characters)
├── uploadedAt: number (timestamp)
└── analysisStatus: "pending" | "analyzing" | "complete" | "error"
```

**주의**: 파일 원본은 저장하지 않음. 추출된 텍스트만 메시지 content에 포함.
서버에서 텍스트 추출 후 파일은 즉시 폐기 (헌법 원칙 V 준수).

### 4. TemplateContext (신규)

문서 생성 대화에서 템플릿 진행 상태.

```
TemplateContext
├── templateType: "lease" | "employment" | "demand-letter" | "power-of-attorney" | "nda"
├── collectedFields: Record<string, string>
├── status: "collecting" | "generating" | "complete"
└── generatedDocument?: string (Markdown 형식의 최종 문서)
```

### 5. Citation (신규)

인터랙티브 인용 정보. 기존 `Source` 타입을 확장.

```
Citation extends Source
├── type: "statute" | "precedent" | "rule"  [기존]
├── name: string                             [기존]
├── identifier: string                       [기존]
├── fullText?: string                        [NEW - 조문 전문]
├── externalUrl?: string                     [NEW - law.go.kr 딥링크]
├── verified: boolean                        [NEW - 출처 검증 여부]
└── articleNumber?: string                   [NEW - 조문 번호]
```

## Entity Relationships

```
Conversation 1──* Message
Message 0──1 DocumentContext
Message 0──1 TemplateContext
Message 0──* Citation (via sources)
```

## Storage Constraints (localStorage)

- 기존 제한 유지: `MAX_CONVERSATIONS = 50`
- 문서 분석 대화는 추출된 텍스트가 길 수 있으므로, 분석 완료 후 추출된 원문을 요약으로 대체하여 저장 공간 절약.
- localStorage 용량 제한 (~5-10MB): `QuotaExceededError` 기존 처리 로직 유지 (80% 트림 -> 전체 삭제).
- `Citation.fullText`는 lazy load -- 최초 클릭 시에만 MCP를 통해 가져오고 캐싱.

## State Transitions

### DocumentContext.analysisStatus
```
pending -> analyzing -> complete
pending -> analyzing -> error
```

### TemplateContext.status
```
collecting -> generating -> complete
collecting -> collecting (추가 필드 수집 반복)
```

## Validation Rules

- `DocumentContext.fileSize` <= 4,500,000 bytes (Vercel 4.5MB 제한)
- `DocumentContext.fileType` in ["pdf", "docx", "txt"]
- `TemplateContext.templateType` in ["lease", "employment", "demand-letter", "power-of-attorney", "nda"]
- `Citation.externalUrl` must match `law.go.kr` domain pattern
