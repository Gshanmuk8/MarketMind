/**
 * Tolerant parsing for model JSON output. Even with response_format
 * json_object, providers occasionally wrap JSON in markdown fences or
 * prose — never let that take down a pipeline step.
 */
export function parseAiJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error(`[ai] Model did not return JSON: ${trimmed.slice(0, 200)}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  }
}

/** Coerce a model field to prose: arrays join, non-strings become "". */
export function aiText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string").join(", ");
  }
  return "";
}

/** Coerce a model field to a string list: strings wrap, junk drops. */
export function aiList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}
