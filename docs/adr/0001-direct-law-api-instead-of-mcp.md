# ADR 0001: Call law.go.kr directly instead of through the MCP server

- Status: Accepted
- Date: 2026-04-09 (commit `45a57c5`)

## Context

The chat route first got its legal tools from the external [korean-law-mcp](https://github.com/chrisryugj/korean-law-mcp) server over MCP Streamable HTTP (`lib/mcp/client.ts`, `lib/mcp/tool-bridge.ts`). Two earlier fixes released MCP sessions at request boundaries (`50e95d3`, `3e42db1`), but production still failed: the shared MCP service was already saturated and rejected new sessions before the app could open one. The repo already had direct law.go.kr DRF clients in `lib/law/`, used by the citation route.

## Decision

Define the legal tool schemas locally (`LAW_TOOL_DEFINITIONS` in `lib/law/tools.ts`) and execute every tool call with the direct clients (`executeLawToolCall`). `app/api/chat/route.ts` no longer imports `lib/mcp/`. The commit records the rule: keep legal search tools local unless only an external service can fill a capability gap.

## Consequences

- One fewer network hop and no dependency on someone else's session capacity. Reliability now depends only on law.go.kr, handled with a 10 s timeout, 2 attempts and 300 ms backoff in `lib/law/client.ts`.
- The app owns the tool behaviour, which later allowed search fallbacks (`searchLawWithFallback`, `searchPrecedentWithFallback`) and the intelligent-search tool `search_law_articles` (`f2f6df4`).
- `LAW_API_KEY` is now needed for every tool call, not only for citations.
- `lib/mcp/` and its tests remain but are unused by the app; `MCP_BASE_URL` (added later in `0178232`) and the scheduled `keep-hf-space-awake.yml` workflow only matter if MCP returns.

## Alternatives considered

- Retry with backoff around the MCP connection: rejected in the commit message because it still depends on external capacity and keeps user-visible failures.
- MCP as primary with local fallback: rejected as extra branching with no benefit once equivalent local clients existed.
