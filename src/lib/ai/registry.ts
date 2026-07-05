import { env } from "@/lib/env";
import { OpenAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { AiProvider, AiProviderId } from "@/lib/ai/types";

/**
 * Provider registry. Every provider here speaks the OpenAI-compatible
 * dialect, so adding a new one is a single line. Nothing outside the
 * AI layer may import this file — use `ai.complete()` from index.ts.
 */
const providers: Record<AiProviderId, AiProvider> = {
  openrouter: new OpenAiCompatibleProvider(
    "openrouter",
    "https://openrouter.ai/api/v1",
    env.OPENROUTER_API_KEY,
    {
      "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      "X-Title": "MarketMind AI",
    }
  ),
  openai: new OpenAiCompatibleProvider("openai", "https://api.openai.com/v1", env.OPENAI_API_KEY),
  gemini: new OpenAiCompatibleProvider(
    "gemini",
    "https://generativelanguage.googleapis.com/v1beta/openai",
    env.GEMINI_API_KEY
  ),
  anthropic: new OpenAiCompatibleProvider(
    "anthropic",
    "https://api.anthropic.com/v1",
    env.ANTHROPIC_API_KEY
  ),
  groq: new OpenAiCompatibleProvider("groq", "https://api.groq.com/openai/v1", env.GROQ_API_KEY),
  cerebras: new OpenAiCompatibleProvider(
    "cerebras",
    "https://api.cerebras.ai/v1",
    env.CEREBRAS_API_KEY
  ),
  deepseek: new OpenAiCompatibleProvider(
    "deepseek",
    "https://api.deepseek.com/v1",
    env.DEEPSEEK_API_KEY
  ),
};

export function getProvider(id: AiProviderId): AiProvider {
  return providers[id];
}

export function configuredProviders(): AiProvider[] {
  return Object.values(providers).filter((p) => p.isConfigured());
}
