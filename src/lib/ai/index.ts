import { getProvider } from "@/lib/ai/registry";
import { ROUTES } from "@/lib/ai/router";
import type { CompletionRequest, CompletionResponse } from "@/lib/ai/types";

export type { AiMessage, AiTaskKind, CompletionRequest, CompletionResponse } from "@/lib/ai/types";

/**
 * The single entry point to AI for all business logic.
 *
 *   const res = await ai.complete({
 *     task: "company-analysis",
 *     messages: [{ role: "user", content: prompt }],
 *     json: true,
 *   });
 *
 * Routing, fallback, and provider selection are invisible to callers.
 */
export const ai = {
  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const routes = ROUTES[req.task];
    let lastError: unknown;

    for (const route of routes) {
      const provider = getProvider(route.provider);
      if (!provider.isConfigured()) continue;
      try {
        return await provider.complete(req, req.model ?? route.model);
      } catch (error) {
        lastError = error;
        // Fall through to the next route in the chain.
      }
    }

    throw new Error(
      `[ai] No configured provider succeeded for task "${req.task}". ` +
        `Set OPENROUTER_API_KEY at minimum. Last error: ${String(lastError ?? "none configured")}`
    );
  },

  /** Streaming variant for chat UX. Uses the first configured route only. */
  stream(req: CompletionRequest): AsyncIterable<string> {
    const route = ROUTES[req.task].find((r) => getProvider(r.provider).isConfigured());
    if (!route) {
      throw new Error(`[ai] No configured provider for task "${req.task}".`);
    }
    return getProvider(route.provider).stream(req, req.model ?? route.model);
  },
};
