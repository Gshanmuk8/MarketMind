import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Upstash Redis for caching scraped pages, AI responses, and rate limits.
 * Optional in development — callers must handle `null` (cache miss path).
 */
export const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** Cache helper: get-or-compute with TTL. Falls through when Redis is absent. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  if (!redis) return compute();
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const value = await compute();
  await redis.set(key, value, { ex: ttlSeconds });
  return value;
}
