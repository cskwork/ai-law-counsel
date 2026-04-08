# API Contracts: Market-Driven Enhancements

**Branch**: `001-market-driven-enhancements` | **Date**: 2026-04-08

## 1. Document Upload & Analysis Endpoint

### POST /api/upload

문서 업로드 및 텍스트 추출. 추출된 텍스트를 반환하며, 서버에 파일을 저장하지 않음.

**Request**:
```
Content-Type: multipart/form-data

Fields:
  file: File (PDF, DOCX, or TXT, max 4.5MB)
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "fileName": "임대차계약서.pdf",
    "fileType": "pdf",
    "fileSize": 245000,
    "extractedText": "제1조 (목적) 갑은 을에게...",
    "extractedTextLength": 15230
  }
}
```

**Response (400)**:
```json
{
  "success": false,
  "error": "지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 업로드 가능합니다."
}
```

**Response (413)**:
```json
{
  "success": false,
  "error": "파일 크기가 4.5MB를 초과합니다."
}
```

---

## 2. Chat Endpoint (기존 확장)

### POST /api/chat

기존 SSE 스트리밍 엔드포인트를 확장. 문서 분석 및 템플릿 생성 컨텍스트를 지원.

**Request Body 확장**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "이 계약서를 분석해주세요.",
      "documentContext": {
        "fileName": "임대차계약서.pdf",
        "fileType": "pdf",
        "fileSize": 245000,
        "extractedText": "제1조 (목적) 갑은 을에게...",
        "extractedTextLength": 15230
      }
    }
  ]
}
```

**기존 검증 규칙 유지**:
- messages: 배열, 비어있지 않음, 최대 50개
- 각 메시지: role + content 필수
- content 길이: 최대 2000자 (단, `documentContext.extractedText` 포함 시 별도 제한)

**추가 검증**:
- `documentContext` 제공 시: `extractedText` 길이 최대 50,000자
- `extractedText`는 서버로 전송되지만, LLM 컨텍스트 윈도우에 맞게 청킹됨

**SSE 이벤트 (기존 + 확장)**:
```
event: tool_call     // 기존 - 도구 호출 시작
event: tool_result   // 기존 - 도구 호출 결과
event: content       // 기존 - 응답 텍스트 스트리밍
event: error         // 기존 - 오류
event: done          // 기존 - 스트림 종료

// done 이벤트 확장:
data: {
  "sources": [
    {
      "type": "statute",
      "name": "주택임대차보호법",
      "identifier": "법률 제xxxxx호",
      "fullText": "제3조의2(보증금의 회수) ...",     // NEW
      "externalUrl": "https://www.law.go.kr/...",    // NEW
      "verified": true,                                // NEW
      "articleNumber": "3-2"                           // NEW
    }
  ]
}
```

---

## 3. Citation Fetch Endpoint (신규)

### GET /api/citation?type={type}&id={identifier}

특정 인용의 전문을 가져옴. 클라이언트에서 인용 클릭 시 lazy load.

**Request**:
```
GET /api/citation?type=statute&id=주택임대차보호법&article=3-2
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "type": "statute",
    "name": "주택임대차보호법",
    "articleNumber": "3-2",
    "fullText": "제3조의2(보증금의 회수) 임차인이 ...",
    "externalUrl": "https://www.law.go.kr/LSW/lsSideInfoP.do?lsiSeq=...",
    "verified": true,
    "fetchedAt": "2026-04-08T10:30:00Z"
  }
}
```

**Response (404)**:
```json
{
  "success": false,
  "error": "해당 법령 조문을 찾을 수 없습니다."
}
```

**Response (503)**:
```json
{
  "success": false,
  "error": "국가법령정보센터에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
}
```
