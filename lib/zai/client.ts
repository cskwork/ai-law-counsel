/**
 * Z.ai LLM 클라이언트
 * - GLM-4.7 모델과 통신하는 HTTP 클라이언트
 * - 일반 채팅, 도구 사용 채팅, 스트리밍 지원
 */
import type {
  ChatMessage,
  ToolDefinition,
  ZaiRequestBody,
  ZaiResponse,
} from './types';

/** Z.ai API 엔드포인트 */
const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

/** 사용 모델 */
const MODEL = 'glm-5-turbo';

export class ZaiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** 일반 채팅 완성 (비스트리밍) */
  async completeChat(messages: ChatMessage[]): Promise<ZaiResponse> {
    const body: ZaiRequestBody = {
      model: MODEL,
      messages,
      stream: false,
    };

    return this.request(body);
  }

  /** 도구 사용 채팅 완성 (비스트리밍) */
  async completeChatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): Promise<ZaiResponse> {
    const body: ZaiRequestBody = {
      model: MODEL,
      messages,
      stream: false,
      tools,
      tool_choice: 'auto',
    };

    return this.request(body);
  }

  /** 스트리밍 채팅 - 원시 Response 반환 */
  async streamChat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const body: ZaiRequestBody = {
      model: MODEL,
      messages,
      stream: true,
      ...(tools && tools.length > 0 && { tools, tool_choice: 'auto' as const }),
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    this.checkResponseStatus(response);
    return response;
  }

  /** API 요청 실행 및 JSON 파싱 */
  private async request(body: ZaiRequestBody): Promise<ZaiResponse> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    this.checkResponseStatus(response);
    return response.json() as Promise<ZaiResponse>;
  }

  /** 응답 상태 코드 검증 - 에러 시 한국어 메시지와 함께 예외 발생 */
  private checkResponseStatus(response: Response): void {
    if (response.ok) return;

    const { status, statusText } = response;

    if (status === 401) {
      throw new Error('Z.ai API 인증 실패. ZAI_API_KEY를 확인하세요.');
    }

    if (status === 429) {
      throw new Error('Z.ai API 요청 한도 초과. 잠시 후 다시 시도하세요.');
    }

    throw new Error(`Z.ai API 오류: ${status} ${statusText}`);
  }
}

/** 환경 변수에서 API 키를 읽어 ZaiClient 인스턴스 생성 */
export function createZaiClient(): ZaiClient {
  const apiKey = process.env.ZAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ZAI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.',
    );
  }

  return new ZaiClient(apiKey);
}
