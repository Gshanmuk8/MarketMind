import { AiHttpError } from "@/lib/ai/errors";
import { getProvider } from "@/lib/ai/registry";
import { ROUTES, type ModelRoute } from "@/lib/ai/router";
import type { CompletionRequest, CompletionResponse } from "@/lib/ai/types";

export type { AiMessage, AiTaskKind, CompletionRequest, CompletionResponse } from "@/lib/ai/types";

/**
 * Route cooldowns (circuit breaker — doc 08). A route that just failed is
 * benched so the next call skips straight to a healthy provider instead of
 * re-paying the failure latency. In-memory per instance: an optimization,
 * never a guarantee — if every route is benched we retry them anyway.
 */
const cooldowns = new Map<string, { until: number; reason: string }>();

const routeKey = (r: ModelRoute) => `${r.provider}:${r.model}`;

function benchRoute(route: ModelRoute, error: unknown): void {
  let ms = 30_000; // network errors / 5xx: brief blip
  const reason = String(error instanceof Error ? error.message : error).slice(0, 200);
  if (error instanceof AiHttpError) {
    if (error.status === 429) {
      ms = Math.min(error.retryAfterMs ?? 60_000, 120_000);
    } else if ([401, 402, 403, 404].includes(error.status)) {
      ms = 300_000; // bad key / no credits / dead model — won't heal quickly
    }
  }
  cooldowns.set(routeKey(route), { until: Date.now() + ms, reason });
}

function benched(route: ModelRoute): boolean {
  const entry = cooldowns.get(routeKey(route));
  if (!entry) return false;
  if (entry.until <= Date.now()) {
    cooldowns.delete(routeKey(route));
    return false;
  }
  return true;
}

function configuredRoutes(req: CompletionRequest): ModelRoute[] {
  return ROUTES[req.task].filter((r) => getProvider(r.provider).isConfigured());
}

function chainError(req: CompletionRequest, failures: string[]): Error {
  return new Error(
    `[ai] No configured provider succeeded for task "${req.task}". ` +
      `Set OPENROUTER_API_KEY at minimum. ` +
      (failures.length ? `Route failures: ${failures.join(" | ")}` : "No providers configured.")
  );
}

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
    const routes = configuredRoutes(req);
    const failures: string[] = [];
    const skipped: ModelRoute[] = [];

    for (const route of routes) {
      if (benched(route)) {
        skipped.push(route);
        continue;
      }
      try {
        return await getProvider(route.provider).complete(req, req.model ?? route.model);
      } catch (error) {
        benchRoute(route, error);
        failures.push(`${routeKey(route)}: ${String(error).slice(0, 200)}`);
      }
    }

    // Every healthy-looking route failed. Benched routes are still worth a
    // shot — cooldowns are advisory, and the soonest-to-recover goes first.
    skipped.sort(
      (a, b) => (cooldowns.get(routeKey(a))?.until ?? 0) - (cooldowns.get(routeKey(b))?.until ?? 0)
    );
    for (const route of skipped) {
      try {
        return await getProvider(route.provider).complete(req, req.model ?? route.model);
      } catch (error) {
        benchRoute(route, error);
        failures.push(`${routeKey(route)}: ${String(error).slice(0, 200)}`);
      }
    }

    throw chainError(req, failures);
  },

  /**
   * Streaming variant for chat UX. Probes routes in order until one delivers
   * its first token; failures before the first token advance the chain.
   */
  async *stream(req: CompletionRequest): AsyncIterable<string> {
    const routes = configuredRoutes(req);
    const failures: string[] = [];
    const ordered = [
      ...routes.filter((r) => !benched(r)),
      ...routes.filter((r) => benched(r)),
    ];

    for (const route of ordered) {
      const iterator = getProvider(route.provider)
        .stream(req, req.model ?? route.model)
        [Symbol.asyncIterator]();

      let first: IteratorResult<string>;
      try {
        first = await iterator.next();
      } catch (error) {
        benchRoute(route, error);
        failures.push(`${routeKey(route)}: ${String(error).slice(0, 200)}`);
        continue;
      }

      // First token arrived — this stream is committed; mid-stream errors
      // propagate (we can't splice a different model into a half answer).
      if (!first.done) yield first.value;
      while (true) {
        const next = await iterator.next();
        if (next.done) return;
        yield next.value;
      }
    }

    throw chainError(req, failures);
  },
};
