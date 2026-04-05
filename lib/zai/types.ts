/**
 * Z.ai API 타입 정의
 * - 채팅 메시지, 도구 정의, API 요청/응답 인터페이스
 */

/** 메시지 역할 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** 채팅 메시지 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  tool_call_id?: string;
}

/** 도구 함수 정의 */
export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** 도구 정의 (function 타입) */
export interface ToolDefinition {
  type: 'function';
  function: ToolFunction;
}

/** 도구 호출 결과 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON 문자열
  };
}

/** Z.ai 응답 선택지 */
export interface ZaiChoice {
  index: number;
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: ToolCall[];
  };
  message?: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string | null;
}

/** Z.ai API 응답 */
export interface ZaiResponse {
  id: string;
  choices: ZaiChoice[];
}

/** Z.ai API 요청 본문 */
export interface ZaiRequestBody {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none';
}
