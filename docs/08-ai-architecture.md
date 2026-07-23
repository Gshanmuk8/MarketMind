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

AI unavailability degrades gracefully, never blocks core flows: digests fall back to a stub strategic summary; enrichment failures may store the raw-but-labeled signal at INFO. A hard failure of the full fallback chain throws a descriptive error naming the task and every route's failure.

Resilience mechanics inside the AI layer (invisible to callers):

- **Route cooldowns (circuit breaker).** A route that fails is benched in-memory before the chain moves on: hard failures (401/402/403/404 — bad key, no credits, dead model) for 5 minutes; 429s for the provider's own `Retry-After`/retry-delay (capped at 2 min); network/5xx for 30s. Subsequent calls skip benched routes instantly instead of re-paying the failure latency. If _every_ configured route is benched, the chain retries them anyway in soonest-recovery order — cooldowns are an optimization, never a reason to fail a task without trying.
- **Suspect responses are failures.** A 200 with empty content, or a truncated response (`finish_reason: length`) when JSON was requested, throws inside the provider so the chain falls through — a downstream JSON parse error must never be the first symptom.
- **Streaming falls back too.** `ai.stream()` probes routes in order until one delivers its first token; failures before the first token advance the chain (after the first token the stream is committed).
- **Provider dialect quirks stay in the provider.** e.g. OpenAI reasoning-family models (`gpt-5*`, `o*`) take `max_completion_tokens` and fixed temperature; the provider adapts the request so the routing table stays declarative.

## Model routing reality check

Routes must contain only model ids that exist on each provider (verify against `/v1/models` when tuning). Chains for every task end in the currently-healthy commodity set so any single working provider can carry the app; premium routes sit first and re-engage automatically when their keys/credits return.

## Cost controls

Cap input sizes (e.g. 24k chars of page text), prefer cheap routes for bulk work, cache expensive outputs via `cached()` where reuse is likely.
