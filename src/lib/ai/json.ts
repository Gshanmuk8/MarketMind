/**
 * Tolerant parsing for model JSON output. Even with response_format
 * json_object, providers occasionally wrap JSON in markdown fences or
 * prose — never let that take down a pipeline step.
 */
export function parseAiJson<T>(text: string): T {
  // Reasoning models (gpt-oss, GLM, …) may prepend a hidden chain-of-thought
  // that can contain stray braces/JSON examples — strip it before anything
  // else, or the bracket-slice fallback grabs the wrong object.
  const withoutThinking = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  // Strip markdown fences — models often emit ```json even under
  // response_format.
  const trimmed = withoutThinking
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Fall back to the outermost object/array — models sometimes preface
    // JSON with prose ("Here is the analysis:") or append a sign-off.
    for (const [open, close] of [
      ["{", "}"],
      ["[", "]"],
    ] as const) {
      const start = trimmed.indexOf(open);
      const end = trimmed.lastIndexOf(close);
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1)) as T;
        } catch {
          // Try the next bracket pair.
        }
      }
    }
    throw new Error(`[ai] Model did not return JSON: ${trimmed.slice(0, 200)}`);
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
