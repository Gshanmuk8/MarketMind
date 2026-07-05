# 08 · AI Architecture

## The abstraction

Business logic depends only on `ai.complete({ task, messages, json?, temperature?, maxTokens? })` and `ai.stream()` from `@/lib/ai`. **No model or provider name may appear outside `src/lib/ai/router.ts`.**

```
caller ──> ai.complete({ task }) ──> ROUTES[task] (ordered fallback chain)
                                        └─> provider registry ──> OpenAI-compatible HTTP
```

## Providers

All seven speak the OpenAI chat-completions dialect, so one implementation (`OpenAiCompatibleProvider`) powers the whole registry: **OpenRouter** (primary gateway — the only key required), OpenAI, Gemini, Anthropic, Groq, Cerebras, DeepSeek. Adding a provider is one registry line. A provider is active iff its env key is set.

## Task-based routing

Tasks, not models, are the unit of choice. Current kinds: `company-analysis`, `competitor-discovery`, `extraction`, `summarization`, `scoring`, `strategy`, `chat`.

Routing principles:

- **Frontier models** for strategy, analysis, discovery, chat — quality is the product.
- **Cheap + fast models** (Groq/Cerebras/Flash-class) for high-volume extraction, scoring, and summarization.
- Every task has an ordered fallback chain; unconfigured or failing providers are skipped automatically.
- `json: true` forces `response_format: json_object`; callers parse and validate defensively.

## Grounding rules

- Prompts that produce user-facing conclusions must distinguish evidence from inference and be conservative with severity (see `enrichSignal`).
- Chat/report prompts must be grounded in retrieved signals/insights/decisions and cite them (`ChatMessage.sources`).
- AI output is never stored as a verified fact: anything model-generated is `isInference: true` or lives in inference-only tables (Insight, Decision briefs).

## Failure posture

AI unavailability degrades gracefully, never blocks core flows: digests fall back to a stub strategic summary; enrichment failures may store the raw-but-labeled signal at INFO. A hard failure of the full fallback chain throws a descriptive error naming the task.

## Cost controls

Cap input sizes (e.g. 24k chars of page text), prefer cheap routes for bulk work, cache expensive outputs via `cached()` where reuse is likely.
