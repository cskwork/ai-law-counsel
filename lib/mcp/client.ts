/**
 * korean-law-mcp 클라이언트
 * - 기본 단위는 요청/작업 범위의 세션 객체다.
 * - 각 세션은 terminateSession() + close()로 명시 종료한다.
 * - 레거시 top-level 함수는 하위 호환용 래퍼로만 유지한다.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const CONNECTION_TIMEOUT_MS = 15_000;
const DEFAULT_MCP_BASE_URL = 'https://korean-law-mcp.fly.dev';

interface SessionState {
  client: Client | null;
  transport: StreamableHTTPClientTransport | null;
  tools: Tool[] | null;
  connectPromise: Promise<Client> | null;
}

export interface McpClientSession {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
  close(): Promise<void>;
}

/** MCP 서버 URL 생성 (MCP_BASE_URL 환경변수로 호스팅 전환 가능) */
function buildMcpUrl(): URL {
  const ocKey = process.env.LAW_API_KEY;
  if (!ocKey) {
    throw new Error('LAW_API_KEY 환경변수가 설정되지 않았습니다');
  }
  const baseUrl = process.env.MCP_BASE_URL || DEFAULT_MCP_BASE_URL;
  const url = new URL('/mcp', baseUrl);
  url.searchParams.set('oc', ocKey);
  return url;
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

class RequestScopedMcpClientSession implements McpClientSession {
  private readonly state: SessionState = {
    client: null,
    transport: null,
    tools: null,
    connectPromise: null,
  };

  async listTools(): Promise<Tool[]> {
    if (this.state.tools) {
      return this.state.tools;
    }

    try {
      return await this.fetchTools();
    } catch (error) {
      if (!isSessionError(error)) {
        throw error;
      }

      await this.reset();
      return await this.fetchTools();
    }
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    try {
      const client = await this.getClient();
      const result = await client.callTool({ name, arguments: args });
      return result as CallToolResult;
    } catch (error) {
      if (!isSessionError(error)) {
        throw error;
      }

      await this.reset();
      const client = await this.getClient();
      const result = await client.callTool({ name, arguments: args });
      return result as CallToolResult;
    }
  }

  async close(): Promise<void> {
    await this.reset();
  }

  private async fetchTools(): Promise<Tool[]> {
    const client = await this.getClient();
    const allTools: Tool[] = [];
    let cursor: string | undefined;

    do {
      const result = await client.listTools({ cursor });
      allTools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);

    this.state.tools = allTools;
    return allTools;
  }

  private async getClient(): Promise<Client> {
    if (this.state.client) {
      return this.state.client;
    }

    if (this.state.connectPromise) {
      return await this.state.connectPromise;
    }

    const client = new Client({
      name: 'ai-law-counsel',
      version: '0.1.0',
    });

    const transport = new StreamableHTTPClientTransport(buildMcpUrl());

    client.onclose = () => {
      if (this.state.client === client) {
        this.state.client = null;
        this.state.transport = null;
        this.state.tools = null;
      }
    };

    const connectPromise = (async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MCP 서버 연결 타임아웃')), CONNECTION_TIMEOUT_MS),
      );

      await Promise.race([client.connect(transport), timeoutPromise]);
      this.state.client = client;
      this.state.transport = transport;
      return client;
    })()
      .catch(async (error) => {
        await this.closeResources(client, transport);
        throw error;
      })
      .finally(() => {
        if (this.state.connectPromise === connectPromise) {
          this.state.connectPromise = null;
        }
      });

    this.state.connectPromise = connectPromise;
    return await connectPromise;
  }

  private async reset(): Promise<void> {
    const { client, transport } = this.state;

    this.state.client = null;
    this.state.transport = null;
    this.state.tools = null;
    this.state.connectPromise = null;

    await this.closeResources(client, transport);
  }

  private async closeResources(
    client: Client | null,
    transport: StreamableHTTPClientTransport | null,
  ): Promise<void> {
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
}

export function createMcpClientSession(): McpClientSession {
  return new RequestScopedMcpClientSession();
}

let defaultSession: McpClientSession | null = null;

function getDefaultSession(): McpClientSession {
  if (!defaultSession) {
    defaultSession = createMcpClientSession();
  }

  return defaultSession;
}

/** 하위 호환용 싱글톤 래퍼 */
export async function listMcpTools(): Promise<Tool[]> {
  return await getDefaultSession().listTools();
}

/** 하위 호환용 싱글톤 래퍼 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  return await getDefaultSession().callTool(name, args);
}

/** 하위 호환용 싱글톤 세션 종료 */
export async function resetMcpClient(): Promise<void> {
  const session = defaultSession;
  defaultSession = null;

  if (!session) {
    return;
  }

  await session.close();
}

/** 프로세스 종료 시 기본 세션 정리 (best-effort, fire-and-forget) */
if (typeof process !== 'undefined' && process.on) {
  const cleanup = () => {
    const session = defaultSession;
    defaultSession = null;
    void session?.close();
  };

  process.on('beforeExit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}
