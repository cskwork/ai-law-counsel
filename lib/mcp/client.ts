/**
 * korean-law-mcp 클라이언트
 * - StreamableHTTP 트랜스포트로 fly.dev 원격 서버 연결
 * - 모듈 레벨 싱글톤으로 warm start 시 재사용
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const CONNECTION_TIMEOUT_MS = 15_000;

/** MCP 클라이언트 싱글톤 */
let cachedClient: Client | null = null;
let cachedTools: Tool[] | null = null;

/** MCP 서버 URL 생성 */
function buildMcpUrl(): URL {
  const ocKey = process.env.LAW_API_KEY;
  if (!ocKey) {
    throw new Error('LAW_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return new URL(`https://korean-law-mcp.fly.dev/mcp?oc=${ocKey}`);
}

/** MCP 클라이언트 연결 (싱글톤) */
async function getClient(): Promise<Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new Client({
    name: 'ai-law-counsel',
    version: '0.1.0',
  });

  const transport = new StreamableHTTPClientTransport(buildMcpUrl());

  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('MCP 서버 연결 타임아웃')), CONNECTION_TIMEOUT_MS),
  );

  await Promise.race([connectPromise, timeoutPromise]);

  cachedClient = client;
  return client;
}

/** 사용 가능한 MCP 도구 목록 조회 (캐시) */
export async function listMcpTools(): Promise<Tool[]> {
  if (cachedTools) {
    return cachedTools;
  }

  const client = await getClient();
  const allTools: Tool[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.listTools({ cursor });
    allTools.push(...result.tools);
    cursor = result.nextCursor;
  } while (cursor);

  cachedTools = allTools;
  return allTools;
}

/** MCP 도구 호출 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const client = await getClient();
  const result = await client.callTool({ name, arguments: args });
  return result as CallToolResult;
}

/** 캐시 초기화 (테스트용) */
export function resetMcpClient(): void {
  cachedClient = null;
  cachedTools = null;
}
