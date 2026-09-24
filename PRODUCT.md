# Product

<!-- impeccable:product-schema 1 -->

> Provenance: written 2026-09-24 during an unattended redesign run. No interview was possible (no question channel); the owner's standing instruction was to proceed "as recommended". Facts marked **[inferred]** come from the repository, README, `.specify/memory/constitution.md`, and the live site, not from a confirmed answer. Confirm or correct them on the next attended session.

## Platform

web

## Users

- **[inferred]** Korean-speaking adults facing an everyday legal problem (jeonse deposit not returned, unfair dismissal, traffic-accident settlement, refund refusal, noise disputes) who cannot or do not yet want to pay a lawyer. They arrive anxious, often on a phone, and want to know which law applies and what to do next.
- **[inferred]** Secondary: people who need a first draft of a routine legal document (lease, employment contract, certified demand letter, power of attorney, NDA) or want a contract they received checked for risky clauses.
- **[inferred]** Portfolio reviewers evaluating the project as an engineering demonstration.

## Product Purpose

Answer Korean legal questions in plain Korean, grounded in real statutes, precedents, and administrative rules fetched live from the National Law Information Center (law.go.kr), and make every cited source checkable against the official text. Success: the user leaves knowing which provisions apply, what their options are, and where to get human help, and can verify each citation themselves.

## Positioning

The model does not answer from memory: it autonomously calls legal-search tools (up to 10 rounds, via the korean-law-mcp server) and streams an answer whose citations open the official article text inline, with a verified/pending marker and a law.go.kr deeplink. A generic chatbot cannot truthfully copy "every citation is clickable and traceable to the government source."

## Operating Context

- Single-screen chat: suggested questions grouped as 법률 상담 / 문서 작성, free-text composer, document upload (PDF, DOCX, TXT, up to 4.5MB), streaming answer with visible tool-call progress (법령 검색, 판례 검색, ...), sources footer, inline citation cards.
- Conversation history lives only in the browser (localStorage, max 50), reachable from a slide-over list.
- Adjustable reading size (A- / A+) persisted locally.
- Emergency hotlines (132, 112, 1366, 109) shown deterministically on the empty state.

## Capabilities and Constraints

- Next.js 14 App Router, React 18, Tailwind 3, Vercel serverless. LLM: Z.ai GLM with function calling; legal data: law.go.kr Open API via MCP.
- No accounts, no server-side storage of conversations.
- Constitution (binding): evidence-based answers only, no fabricated sources; the three-layer legal disclaimer (UI banner, system prompt, docs) must never be removed or weakened; emergency hotlines must be shown; government text displayed without semantic change.
- Terminology: 법령 (statute), 판례 (precedent), 행정규칙 (administrative rule), 조문 (article), 내용증명 (certified demand letter).

## Brand Commitments

- Name shown to users: 법률 상담 AI.
- Disclaimer copy: "본 서비스는 AI 기반 법률 정보 제공이며, 정식 법률 자문이 아닙니다. 문서 분석 결과는 참고용이며, 법적 효력이 없습니다." Keep verbatim.
- **[inferred]** Voice: calm, precise, polite Korean (합쇼체/해요체 mix already in use), never salesy.

## Evidence on Hand

- Real: the live product, suggested questions, template list, hotline numbers, tool labels.
- Absent, must not be fabricated: user counts, accuracy rates, testimonials, lawyer endorsements, partnerships with courts or law firms.

## Product Principles

1. Every claim points to a source the user can open.
2. Human help is always one tap away; the product never pretends to be a lawyer.
3. The anxious user on a phone comes first: the question box and the next step are always reachable.
4. Nothing leaves the browser except the question itself; history is the user's to keep or erase.

## Accessibility & Inclusion

- **[inferred]** Older and stressed readers: long Korean legal prose must stay readable; user-controlled text size is a committed feature and pinch-zoom must not be blocked.
- Keyboard and screen-reader access for upload, citations, history, and hotlines (existing tests assert aria labels).
