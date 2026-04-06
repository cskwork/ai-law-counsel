/** 출처 항목 */
export interface SourceItem {
  type: 'law' | 'precedent' | 'admin_rule';
  name: string;
  /** lawId, caseNumber, adminRuleId */
  identifier: string;
  /** 국가법령정보센터 링크 (검증된 경우만 존재) */
  url?: string;
}

// SSE(Server-Sent Events) 이벤트 타입 정의
export interface SSEEvent {
  type: 'tool_call' | 'tool_result' | 'content' | 'error' | 'done';
  name?: string;
  args?: Record<string, unknown>;
  summary?: string;
  content?: string;
  message?: string;
  /** done 이벤트에서 참조한 법령/판례 출처 목록 */
  sources?: SourceItem[];
}

// SSE 이벤트를 문자열로 인코딩
export function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// SSE 스트림과 작성자 객체 생성
export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  writer: {
    write: (event: SSEEvent) => void;
    close: () => void;
  };
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    writer: {
      write(event: SSEEvent) {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      },
      close() {
        controller.close();
      },
    },
  };
}
