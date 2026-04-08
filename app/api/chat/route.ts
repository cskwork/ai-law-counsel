import { NextRequest } from 'next/server';
import { createZaiClient } from '@/lib/zai/client';
import { listMcpTools, callMcpTool } from '@/lib/mcp/client';
import { mcpToolsToLlmTools } from '@/lib/mcp/tool-bridge';
import { CLARIFY_TOOL } from '@/lib/zai/tools-schema';
import { executeToolCall } from '@/lib/chat/tool-executor';
import { orchestrateChat } from '@/lib/chat/orchestrator';
import { createSSEStream } from '@/lib/utils/sse';
import { parseZaiStream } from '@/lib/utils/zai-stream';
import type { ChatMessage } from '@/lib/zai/types';
import { MAX_CONTEXT_MESSAGES } from '@/lib/constants';
import { validateDocumentContext, type DocumentContext } from '@/lib/document/context';

const MAX_MESSAGE_LENGTH = 2000;

interface ChatRequestBody {
  messages: ChatMessage[];
  documentContext?: DocumentContext;
}

function validateRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('요청 본문이 비어있습니다');
  }

  const { messages, documentContext } = body as Record<string, unknown>;

  if (!Array.isArray(messages)) {
    throw new Error('messages는 배열이어야 합니다');
  }

  if (messages.length === 0) {
    throw new Error('메시지가 비어있습니다');
  }

  if (messages.length > MAX_CONTEXT_MESSAGES) {
    throw new Error(`메시지는 최대 ${MAX_CONTEXT_MESSAGES}개까지 가능합니다`);
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw new Error('각 메��지에는 role과 content가 필요합니다');
    }
    if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`메시지 길이는 최대 ${MAX_MESSAGE_LENGTH}자까지 가능합니다`);
    }
  }

  // documentContext 검증 (선택적)
  if (documentContext) {
    const docValidation = validateDocumentContext(documentContext as DocumentContext);
    if (!docValidation.valid) {
      throw new Error(docValidation.error);
    }
  }

  return {
    messages: messages as ChatMessage[],
    documentContext: documentContext as DocumentContext | undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, documentContext } = validateRequest(body);

    const zaiClient = createZaiClient();

    // MCP에서 법률 도구 동적 로드 + 로컬 clarify 도구
    const mcpTools = await listMcpTools();
    const llmTools = [...mcpToolsToLlmTools(mcpTools), CLARIFY_TOOL];

    const { stream, writer } = createSSEStream();

    // documentContext가 있으면 마지막 사용자 메시지에 문서 텍스트 첨부
    const enrichedMessages = documentContext
      ? messages.map((msg, i) =>
          i === messages.length - 1 && msg.role === 'user'
            ? { ...msg, content: `[문서 분석 요청: ${documentContext.fileName}]\n\n--- 추출된 문서 내용 ---\n${documentContext.extractedText}\n--- 문서 끝 ---\n\n${msg.content}` }
            : msg
        )
      : messages;

    const orchestrationPromise = orchestrateChat(
      enrichedMessages,
      (event) => writer.write(event),
      {
        tools: llmTools,
        zaiComplete: (msgs, tools) => zaiClient.completeChatWithTools(msgs, tools),
        zaiStream: async function* (msgs, tools) {
          const streamResponse = await zaiClient.streamChat(msgs, tools);
          yield* parseZaiStream(streamResponse);
        },
        executeTool: (name, args) =>
          executeToolCall(name, args, { callMcpTool }),
      },
    );

    orchestrationPromise
      .catch((error) => {
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        writer.write({ type: 'error', message });
      })
      .finally(() => {
        writer.close();
      });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '��버 오류';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
