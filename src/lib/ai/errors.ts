/**
 * Typed provider failure so the fallback chain can classify: hard failures
 * (bad key / no credits / dead model) bench a route for minutes, rate
 * limits for the provider's own retry window, transient blips briefly.
 */
export class AiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Provider-declared wait before retrying, when parseable (429s). */
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "AiHttpError";
  }
}

/** Pull a retry delay out of a 429's headers/body across provider dialects. */
export function parseRetryAfterMs(res: Response, body: string): number | undefined {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  // Gemini: "retryDelay": "12s" — Groq: "Please try again in 7m59.2s"
  const gemini = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (gemini) return Number(gemini[1]) * 1000;
  const groq = body.match(/try again in (?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (groq) return (Number(groq[1] ?? 0) * 60 + Number(groq[2])) * 1000;
  return undefined;
}
