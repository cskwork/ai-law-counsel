import { NextRequest } from 'next/server';
import { createZaiClient } from '@/lib/zai/client';
import { createMcpClientSession } from '@/lib/mcp/client';
import { mcpToolsToLlmTools } from '@/lib/mcp/tool-bridge';
import { CLARIFY_TOOL } from '@/lib/zai/tools-schema';
import { executeToolCall } from '@/lib/chat/tool-executor';
import { orchestrateChat } from '@/lib/chat/orchestrator';
import { createSSEStream } from '@/lib/utils/sse';
import { parseZaiStream } from '@/lib/utils/zai-stream';
import type { ChatMessage } from '@/lib/zai/types';
import { MAX_CONTEXT_MESSAGES } from '@/lib/constants';

const MAX_MESSAGE_LENGTH = 2000;

interface ChatRequestBody {
  messages: ChatMessage[];
}

function validateRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('요청 본문이 비어있습니다');
  }

  const { messages } = body as Record<string, unknown>;

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

  return { messages: messages as ChatMessage[] };
}

export async function POST(request: NextRequest) {
  let mcpSession: ReturnType<typeof createMcpClientSession> | null = null;

  try {
    const body = await request.json();
    const { messages } = validateRequest(body);

    const zaiClient = createZaiClient();
    mcpSession = createMcpClientSession();

    // MCP에서 법률 도구 동적 로드 + 로컬 clarify 도구
    const mcpTools = await mcpSession.listTools();
    const llmTools = [...mcpToolsToLlmTools(mcpTools), CLARIFY_TOOL];

    const { stream, writer } = createSSEStream();

    const orchestrationPromise = orchestrateChat(
      messages,
      (event) => writer.write(event),
      {
        tools: llmTools,
        zaiComplete: (msgs, tools) => zaiClient.completeChatWithTools(msgs, tools),
        zaiStream: async function* (msgs, tools) {
          const streamResponse = await zaiClient.streamChat(msgs, tools);
          yield* parseZaiStream(streamResponse);
        },
        executeTool: (name, args) =>
          executeToolCall(name, args, {
            callMcpTool: (toolName, toolArgs) => mcpSession!.callTool(toolName, toolArgs),
          }),
      },
    );

    void orchestrationPromise
      .catch((error) => {
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        writer.write({ type: 'error', message });
      })
      .finally(async () => {
        try {
          await mcpSession?.close();
        } catch {
          // best-effort: SSE 응답은 닫되 세션 정리 오류는 사용자에게 노출하지 않음
        }
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
    try {
      await mcpSession?.close();
    } catch {
      // best-effort: 초기화 실패 경로의 세션 정리 오류는 무시
    }

    const message = error instanceof Error ? error.message : '��버 오류';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
