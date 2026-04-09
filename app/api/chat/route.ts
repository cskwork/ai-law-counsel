import { NextRequest } from 'next/server';
import { createZaiClient } from '@/lib/zai/client';
import { LAW_TOOL_DEFINITIONS, executeLawToolCall } from '@/lib/law/tools';
import { CLARIFY_TOOL } from '@/lib/zai/tools-schema';
import { executeToolCall } from '@/lib/chat/tool-executor';
import { orchestrateChat } from '@/lib/chat/orchestrator';
import { validateChatRequest } from '@/lib/chat/request-validation';
import { createSSEStream } from '@/lib/utils/sse';
import { parseZaiStream } from '@/lib/utils/zai-stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, documentContext } = validateChatRequest(body);

    const zaiClient = createZaiClient();

    const llmTools = [...LAW_TOOL_DEFINITIONS, CLARIFY_TOOL];

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
          executeToolCall(name, args, {
            callTool: executeLawToolCall,
          }),
      },
    );

    void orchestrationPromise
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
