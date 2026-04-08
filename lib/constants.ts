// 채팅 API 메시지 제한 (서버 검증 + 클라이언트 windowing 공유)
export const MAX_CONTEXT_MESSAGES = 50;

// 문서 업로드 제한
export const MAX_FILE_SIZE = 4_500_000; // 4.5MB (Vercel payload 제한)
export const SUPPORTED_FILE_TYPES = ['pdf', 'docx', 'txt'] as const;
export const MAX_EXTRACTED_TEXT_LENGTH = 50_000; // LLM 컨텍스트 보호
