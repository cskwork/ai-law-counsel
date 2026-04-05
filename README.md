<div align="center">

# AI Law Counsel

**Korean Legal Consultation Chatbot**

AI-powered legal Q&A built on Korean National Law Information Center API + LLM function calling.

Ask any legal question in Korean. The AI searches relevant statutes, precedents, and administrative rules in real-time, then responds with cited legal references.

[Live Demo](https://ai-law-counsel.vercel.app) | [Report Bug](https://github.com/cskwork/ai-law-counsel/issues)

</div>

---

## How It Works

```
User asks a legal question
        |
   LLM analyzes the question
        |
   Calls tools automatically (up to 5 rounds)
   - search_law        : Search statutes by keyword
   - get_law_detail     : Get specific articles
   - search_precedent   : Search court cases
   - get_precedent_detail : Get case details
   - search_admin_rule  : Search administrative rules
   - clarify_situation  : Ask follow-up questions
        |
   Streams the answer with legal citations
```

The LLM decides which laws and precedents to search based on the user's question. No manual tool selection needed.

## Features

- **Real-time statute/precedent search** via National Law Information Center API
- **Function calling loop** -- LLM autonomously searches and cross-references legal sources
- **SSE streaming** -- token-by-token response for natural reading experience
- **Markdown rendering** optimized for legal content (articles, citations, tables)
- **Mobile-first responsive design** with taste-skill UI principles
- **Legal disclaimer** prominently displayed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| LLM | Z.ai GLM (function calling + SSE streaming) |
| Legal Data | Korean National Law Information Center Open API |
| Testing | Vitest (58 test cases) |
| Deployment | Vercel (serverless) |
| Font | Geist (via next/font) |

## Architecture

```
Browser (SSE)
    |
Next.js on Vercel
    |
    +-- app/page.tsx              Chat UI (React)
    +-- app/api/chat/route.ts     SSE streaming endpoint
    |
    +-- lib/chat/orchestrator.ts  Function calling loop (max 5 rounds)
    +-- lib/chat/tool-executor.ts Tool name -> function dispatch
    |
    +-- lib/zai/client.ts         LLM API client (streaming + non-streaming)
    +-- lib/law/client.ts         Law API client (XML parsing, timeout)
    |
External APIs
    +-- Z.ai GLM                  LLM (reasoning + function calling)
    +-- open.law.go.kr            Statutes, precedents, admin rules
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
| `LAW_API_KEY` | [National Law Info Center](https://open.law.go.kr) | Yes (for law search) |

## Testing

```bash
npm run test:run        # Run all tests
npm run test:coverage   # Coverage report
```

58 test cases covering:
- Law API client (URL building, XML parsing, error handling)
- All 5 search functions (parsing Korean XML fields)
- Tool executor (dispatch, error handling)
- Chat orchestrator (tool loop, max rounds, clarify_situation)
- Z.ai client (request format, auth errors)

## Project Structure

```
app/
  api/chat/route.ts           SSE streaming endpoint
  components/
    chat/                     ChatContainer, MessageList, MessageBubble, ChatInput
    common/                   Disclaimer, LoadingDots
    law/                      LawArticleCard, PrecedentCard
lib/
  chat/                       Orchestrator, tool executor, system prompt
  law/                        Law API client + 5 search functions
  zai/                        LLM client + tool schemas
  utils/                      SSE encoding, stream parsing, array helpers
tests/                        58 test cases (Vitest)
```

## Disclaimer

> This service provides AI-generated legal information, not legal advice. Always consult a licensed attorney for specific legal matters.

## License

MIT
