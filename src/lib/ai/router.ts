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
 */
export interface ModelRoute {
  provider: AiProviderId;
  model: string;
}

export const ROUTES: Record<AiTaskKind, ModelRoute[]> = {
  // Every chain ends in the widest set of fallbacks so ANY single
  // configured provider can carry the whole app — a billing failure on
  // one gateway must degrade quality, never availability.
  "company-analysis": [
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  "competitor-discovery": [
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "gemini", model: "gemini-2.5-pro" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  extraction: [
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "cerebras", model: "llama-3.3-70b" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.5-flash" },
  ],
  summarization: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  scoring: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "deepseek", model: "deepseek-chat" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  strategy: [
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "anthropic", model: "claude-sonnet-4-5" },
    { provider: "gemini", model: "gemini-2.5-pro" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
  ],
  chat: [
    { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
    { provider: "openai", model: "gpt-5-mini" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
  ],
};
