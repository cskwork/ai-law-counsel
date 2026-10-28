# ADR 0002: Ground the source list in tool results

- Status: Accepted
- Date: 2026-09-25 (commit `f2f6df4`)

## Context

Answers must be traceable to official text. The system prompt (`lib/chat/system-prompt.ts`) tells the model to cite only statutes and precedents it confirmed with tools this conversation, and to use a `cite:` link format. A prompt is a request, not a guarantee. Before this change the "참조 출처" (sources) list was built from tool search results, so precedents that appeared in a search list but had nothing to do with the answer looked as if they had been cited.

## Decision

Keep a per-request source ledger (`lib/chat/sources.ts`):

1. `recordToolResult` stores every law, precedent and administrative rule a tool returned. An article counts as *read* only if its body text came back.
2. When the answer is finished, `selectCitedSources` collects what the answer cites: `cite:` links, plain-text mentions such as `근로기준법 제23조` (longest law names first, so `근로기준법 시행령` wins over `근로기준법`), and case numbers.
3. Only citations that match a ledger entry become sources. If the answer cites nothing recognisable, the articles and precedents whose body was read are used instead. At most 12 sources, deduplicated, ordered statute → precedent → rule.

Inline `cite:` links are always clickable; `GET /api/citation` fetches the official text from law.go.kr at click time, so the user reads the source, not the model's paraphrase.

## Consequences

- A citation the model invents without a tool call never appears in the sources list.
- The check is on identifiers, not meaning: a correctly cited article can still be summarised wrongly in the answer text.
- Grounding logic is pure and unit-tested (`tests/lib/chat/sources.test.ts`) without calling the LLM.

## Alternatives considered

- Listing every search result as a source: the previous behaviour; it showed unrelated precedents.
- Trusting the prompt alone: no enforcement and nothing to test.
