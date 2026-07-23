import type { AiProviderId, AiTaskKind } from "@/lib/ai/types";

/**
 * Model routing table — the ONLY place model names exist in the codebase.
 *
 * Each task maps to an ordered fallback chain: if the first provider is
 * not configured (or fails), the next is tried. Routes favor OpenRouter
 * as the universal gateway, with direct providers as overrides.
 *
 * Tune freely: cheap+fast models for high-volume extraction, frontier
 * models for strategy. Business logic never changes when this does.
 *
 * Every model id here must exist on its provider (check /v1/models when
 * tuning — a dead id silently burns a fallback slot). Verified 2026-07:
 * Cerebras serves gpt-oss-120b / zai-glm-4.7 / gemma-4-31b (NOT llama);
 * Groq's llama-3.3-70b free tier caps at 100k tokens/day, so gpt-oss-120b
 * and llama-3.1-8b-instant (separate per-model buckets) back it up.
 */
export interface ModelRoute {
  provider: AiProviderId;
  model: string;
}

// The commodity set every chain must end in — any single one of these
// being healthy keeps the whole app alive. Premium routes sit above and
// re-engage automatically when their keys/credits return.
const WIDE_FALLBACK: ModelRoute[] = [
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "cerebras", model: "gpt-oss-120b" },
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "groq", model: "llama-3.1-8b-instant" },
  { provider: "openrouter", model: "google/gemini-2.5-flash" },
];

// A chain may name a WIDE_FALLBACK model as its lead — collapse repeats so
// a failed route is never retried later in the same pass.
function chain(...routes: ModelRoute[]): ModelRoute[] {
  return routes.filter(
    (r, i) => routes.findIndex((x) => x.provider === r.provider && x.model === r.model) === i
  );
}

export const ROUTES: Record<AiTaskKind, ModelRoute[]> = {
  "company-analysis": chain(
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "openai", model: "gpt-5-mini" },
    ...WIDE_FALLBACK
  ),
  "competitor-discovery": chain(
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "gemini", model: "gemini-2.5-pro" },
    ...WIDE_FALLBACK
  ),
  // High-volume + latency-sensitive: lead with fast commodity inference and
  // keep Gemini's free-tier RPM in reserve for the frontier-quality tasks.
  extraction: chain(
    { provider: "cerebras", model: "gpt-oss-120b" },
    { provider: "groq", model: "openai/gpt-oss-120b" },
    { provider: "groq", model: "llama-3.1-8b-instant" },
    ...WIDE_FALLBACK
  ),
  summarization: chain(
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "cerebras", model: "gpt-oss-120b" },
    ...WIDE_FALLBACK
  ),
  scoring: chain(
    { provider: "cerebras", model: "gpt-oss-120b" },
    { provider: "deepseek", model: "deepseek-chat" },
    ...WIDE_FALLBACK
  ),
  strategy: chain(
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "gemini", model: "gemini-2.5-pro" },
    { provider: "cerebras", model: "zai-glm-4.7" },
    ...WIDE_FALLBACK
  ),
  chat: chain(
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "cerebras", model: "zai-glm-4.7" },
    ...WIDE_FALLBACK
  ),
};
