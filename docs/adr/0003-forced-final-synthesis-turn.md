# ADR 0003: Always end with a forced final synthesis turn

- Status: Accepted
- Date: 2026-09-25 (commit `f2f6df4`)

## Context

With autonomous tool calling, GLM sometimes stopped with only a plan ("이제 조문을 조회하겠습니다") and no answer, ran out of rounds mid-research, or degenerated into repeating one word. Users then saw a plan sentence or an endless stream instead of an answer.

## Decision

In `lib/chat/orchestrator.ts`:

- Run at most `MAX_TOOL_ROUNDS = 8` rounds and stop starting new rounds after `TOOL_PHASE_BUDGET_MS = 150_000`.
- Classify a tool-free reply with `isPlanningMessage` (`lib/chat/answer-guard.ts`: empty, or at most 600 characters ending in a "will search/check" verb form or a colon). Send one nudge; if the loop still ends without an answer, call the model once more **without tools** and an instruction to answer only from what the tools returned.
- Stream text live only after 280 characters without a tool call that do not look like a plan, so preambles stay hidden.
- Cut the stream with a notice when `isDegenerateRepetition` fires (last 600 characters, at least 40 tokens, 3 or fewer distinct) or the answer passes 16,000 characters.
- Keep the assistant `tool_calls` in the message history so each `tool` message pairs with its call.

## Consequences

- Every request ends with an answer, a clarifying question, an explicit retry notice, or an error event.
- The final turn may answer with less evidence than ideal; the prompt makes it say "확인이 필요합니다" for anything unconfirmed.
- One extra LLM call in the fallback path.
- The heuristics are Korean-specific regular expressions and are unit-tested (`tests/lib/chat/answer-guard.test.ts`, `tests/lib/chat/orchestrator.test.ts`); new phrasing patterns may need new cases.

## Alternatives considered

- Raising the round limit: does not fix planning-only replies and makes requests slower.
- Ending on the model's last message as-is: the original behaviour that produced the bug.
