<div align="center">

# AI Law Counsel

**Korean Legal Consultation Chatbot**

AI-powered legal Q&A built on Korean National Law Information Center API + LLM function calling via MCP.

Ask any legal question in Korean. The AI searches relevant statutes, precedents, and administrative rules in real time, then responds with verifiable, clickable citations. Upload contracts for risk analysis or generate legal document drafts through guided Q&A.

[Live Demo](https://ai-law-counsel.vercel.app) | [Report Bug](https://github.com/cskwork/ai-law-counsel/issues) | [Contributing](CONTRIBUTING.md)

</div>

---

## Features

### Core Q&A
- **Real-time legal search** -- statutes, precedents, and administrative rules via National Law Information Center
- **Autonomous function calling** -- LLM picks and chains tools (up to 5 rounds) without manual tool selection
- **MCP integration** -- legal tools served by [korean-law-mcp](https://korean-law-mcp.fly.dev) (Model Context Protocol)
- **SSE streaming** -- token-by-token response for natural reading
- **Conversation history** -- persisted in browser, sidebar navigation, context windowing (last 10 turns)

### Document Analysis (PDF / DOCX / TXT, up to 4.5MB)
- Upload a contract or notice and the AI extracts key clauses, flags risks, and cites relevant laws
- Output includes structured summary, risk markers, and legal grounds

### Legal Document Templates (5 types)
Guided Q&A flow that produces a complete draft with cited legal basis:

| Template | Legal Basis |
|----------|-------------|
| 임대차 계약서 (Lease) | 주택임대차보호법, 민법 §§618-654 |
| 근로계약서 (Employment) | 근로기준법 §§17, 2 |
| 내용증명 (Demand Letter) | 민법 §387, 우편법 |
| 위임장 (Power of Attorney) | 민법 §§114-136 |
| 비밀유지계약서 (NDA) | 부정경쟁방지 및 영업비밀보호에 관한 법률 |

### Interactive Citations
- Inline `cite:` protocol links (e.g. `[민법 제750조](cite:statute/민법/750)`)
- Click any citation to view full article text and a verified deeplink to law.go.kr
- All citations are MCP-verified against the official source

### UI / UX
- '변호사의 서재' design system, mobile-first responsive layout
- Adjustable font size (A- / A+) for accessibility
- Prominent legal disclaimer on every response

## How It Works

```
User asks a legal question
        |
   LLM analyzes the question
        |
   Calls MCP tools automatically (up to 5 rounds)
   - search_law          : Search statutes by keyword
   - get_law_detail      : Get specific articles
   - search_precedent    : Search court cases
   - get_precedent_detail: Get case details
   - search_admin_rule   : Search administrative rules
   - clarify_situation   : Ask follow-up questions
        |
   Streams answer with verified citations
```

The LLM decides which laws and precedents to search based on the user's question. No manual tool selection needed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + @tailwindcss/typography |
| LLM | Z.ai `glm-5-turbo` (function calling + SSE streaming) |
| Legal Tools | korean-law-mcp (Streamable HTTP transport) |
| Legal Data | Korean National Law Information Center Open API |
| Doc Parsing | pdf-parse, mammoth |
| Markdown | react-markdown + remark-gfm |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Deployment | Vercel (serverless) |
| Font | Geist (via next/font) |

## Architecture

```
Browser (SSE)
    |
Next.js on Vercel
    |
    +-- app/page.tsx                Chat UI (React)
    +-- app/api/chat/route.ts       SSE streaming endpoint
    +-- app/api/upload/route.ts     File upload + text extraction
    +-- app/api/citation/route.ts   On-click citation lookup
    |
    +-- lib/chat/orchestrator.ts    Function calling loop (max 5 rounds)
    +-- lib/chat/tool-executor.ts   Tool name -> function dispatch
    +-- lib/chat/context-window.ts  Last-10-turn windowing
    +-- lib/chat/template-types.ts  5 legal document templates
    |
    +-- lib/zai/client.ts           LLM API client (streaming + non-streaming)
    +-- lib/mcp/client.ts           MCP session (request-scoped, auto-reconnect)
    +-- lib/mcp/tool-bridge.ts      MCP <-> Z.ai tool schema bridge
    +-- lib/law/client.ts           Direct Law API fallback (XML parsing)
    +-- lib/citation/builder.ts     Citation enrichment + verification
    +-- lib/document/extractor.ts   PDF/DOCX/TXT text extraction
    +-- lib/document/validator.ts   Type/size validation (4.5MB)
    |
External Services
    +-- Z.ai GLM (api.z.ai)                LLM (reasoning + function calling)
    +-- korean-law-mcp.fly.dev             MCP server for legal tools
    +-- open.law.go.kr                     Statutes, precedents, admin rules
```

## Quick Start

```bash
# Clone
git clone https://github.com/cskwork/ai-law-counsel.git
cd ai-law-counsel

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your API keys:
#   ZAI_API_KEY=your_key_here
#   LAW_API_KEY=your_key_here

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API Keys

| Key | Source | Required |
|-----|--------|----------|
| `ZAI_API_KEY` | [Z.ai](https://api.z.ai) | Yes |
| `LAW_API_KEY` | [National Law Info Center](https://open.law.go.kr) | Yes (used as MCP `oc` parameter and for direct fallback calls) |
| `MCP_BASE_URL` | korean-law-mcp host (e.g. `https://your-space.hf.space`) | No (defaults to `https://korean-law-mcp.fly.dev`) |

## Testing

```bash
npm run test:run        # All Vitest unit/integration tests
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:report # Open last E2E HTML report
```

**223 test cases across 31 files** covering:
- Law API client and 6 search/lookup functions (URL building, XML parsing, error handling)
- MCP client (session lifecycle, reconnect, tool dispatch) and tool-bridge
- Z.ai client (streaming, non-streaming, auth errors)
- Chat orchestrator (tool loop, max rounds, clarify, context window)
- Document extractor and validator (PDF, DOCX, TXT, size limits)
- Citation builder and `/api/citation` endpoint
- Template types (5 legal document templates)
- React components (MessageBubble, CitationCard)
- Playwright E2E (home page, upload flow, chat citation flow)

## Project Structure

```
app/
  api/
    chat/route.ts                SSE streaming endpoint
    citation/route.ts            Citation lookup endpoint
    upload/route.ts              File upload + text extraction
  components/
    chat/                        ChatContainer, MessageList, MessageBubble,
                                 ChatInput, Sidebar, FileUpload, CitationCard,
                                 SourcesFooter, ToolCallIndicator,
                                 DocumentDownload, CopyButton
    common/                      Disclaimer, LoadingDots
    law/                         LawArticleCard, PrecedentCard
  hooks/                         useConversationHistory, useFontSize
  types/                         conversation
lib/
  chat/                          Orchestrator, tool executor, system prompt,
                                 context window, template types, validation
  mcp/                           MCP client session + tool bridge
  zai/                           LLM client + tool schemas
  law/                           Direct Law API fallback (5 search functions)
  citation/                      Citation builder + types
  document/                      Extractor (pdf-parse, mammoth) + validator
  utils/                         SSE encoding, stream parsing, sanitize, array
tests/                           Vitest + Playwright (223 cases, 31 files)
```

## Limits and Constants

- Max user message: 2,000 characters
- Max conversation history sent to LLM: 50 messages / 20,000 characters / last 10 turns
- Max upload size: 4.5 MB (Vercel payload limit)
- Supported file types: `pdf`, `docx`, `txt`
- Max extracted text per upload: 50,000 characters (LLM context guard)
- Max tool-calling rounds per response: 5

## Disclaimer

> This service provides AI-generated legal information, not legal advice. Always consult a licensed attorney for specific legal matters.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding style, and PR guidelines.

## License

[MIT License](LICENSE) (c) 2026 cskwork
