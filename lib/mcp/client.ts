/**
 * korean-law-mcp 클라이언트
 * - StreamableHTTP 트랜스포트로 fly.dev 원격 서버 연결
 * - 세션 생명주기 관리: terminateSession() + close()로 누수 방지
 * - 개발 모드 HMR 대응: globalThis 캐시 (Prisma 패턴)
 * - 세션 오류 시 자동 재연결 (1회)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const CONNECTION_TIMEOUT_MS = 15_000;

interface McpCache {
  client: Client | null;
  transport: StreamableHTTPClientTransport | null;
  tools: Tool[] | null;
}

const GLOBAL_KEY = '__mcp_cache__' as const;
const moduleCache: McpCache = { client: null, transport: null, tools: null };

/** 개발 모드에서는 globalThis로 HMR 재시작 시 캐시 유지 */
function getCache(): McpCache {
  if (process.env.NODE_ENV === 'development') {
    const g = globalThis as unknown as Record<string, McpCache>;
    if (!g[GLOBAL_KEY]) {
      g[GLOBAL_KEY] = { client: null, transport: null, tools: null };
    }
    return g[GLOBAL_KEY];
  }
  return moduleCache;
}

/** MCP 서버 URL 생성 */
function buildMcpUrl(): URL {
  const ocKey = process.env.LAW_API_KEY;
  if (!ocKey) {
    throw new Error('LAW_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return new URL(`https://korean-law-mcp.fly.dev/mcp?oc=${ocKey}`);
}

/** 세션 관련 오류인지 판별 */
function isSessionError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('connection') || msg.includes('session') || msg.includes('closed')) {
      return true;
    }
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: number | string }).code;
    if (code === -32000 || code === 'ConnectionClosed') {
      return true;
    }
  }
  return false;
}

/** MCP 클라이언트 연결 (싱글톤) */
async function getClient(): Promise<Client> {
  const cache = getCache();
  if (cache.client) {
    return cache.client;
  }

  const client = new Client({
    name: 'ai-law-counsel',
    version: '0.1.0',
  });

  const transport = new StreamableHTTPClientTransport(buildMcpUrl());

  client.onclose = () => {
    const c = getCache();
    if (c.client === client) {
      c.client = null;
      c.transport = null;
      c.tools = null;
    }
  };

  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('MCP 서버 연결 타임아웃')), CONNECTION_TIMEOUT_MS),
  );

  await Promise.race([connectPromise, timeoutPromise]);

  cache.client = client;
  cache.transport = transport;
  return client;
}

/** 사용 가능한 MCP 도구 목록 조회 (캐시) */
export async function listMcpTools(): Promise<Tool[]> {
  const cache = getCache();
  if (cache.tools) {
    return cache.tools;
  }

  try {
    return await fetchTools();
  } catch (error) {
    if (!isSessionError(error)) throw error;
    await resetMcpClient();
    return await fetchTools();
  }
}

async function fetchTools(): Promise<Tool[]> {
  const client = await getClient();
  const allTools: Tool[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.listTools({ cursor });
    allTools.push(...result.tools);
    cursor = result.nextCursor;
  } while (cursor);

  getCache().tools = allTools;
  return allTools;
}

/** MCP 도구 호출 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  try {
    const client = await getClient();
    const result = await client.callTool({ name, arguments: args });
    return result as CallToolResult;
  } catch (error) {
    if (!isSessionError(error)) throw error;
    await resetMcpClient();
    const client = await getClient();
    const result = await client.callTool({ name, arguments: args });
    return result as CallToolResult;
  }
}

/** 세션 종료 및 캐시 초기화 */
export async function resetMcpClient(): Promise<void> {
  const cache = getCache();
  const { client, transport } = cache;

  cache.client = null;
  cache.transport = null;
  cache.tools = null;

  if (transport) {
    try {
      await transport.terminateSession();
    } catch {
      // best-effort: 서버가 이미 세션을 해제했을 수 있음
    }
  }

  if (client) {
    try {
      await client.close();
    } catch {
      // best-effort: 클라이언트가 이미 닫혀있을 수 있음
    }
  }
}

/** 프로세스 종료 시 세션 정리 (best-effort, fire-and-forget) */
if (typeof process !== 'undefined' && process.on) {
  const cleanup = () => {
    const cache = getCache();
    const { transport, client } = cache;
    cache.client = null;
    cache.transport = null;
    cache.tools = null;
    transport?.terminateSession().catch(() => {});
    client?.close().catch(() => {});
  };

  process.on('beforeExit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}
