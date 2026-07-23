import { fetchCompanyPage } from "@/features/company-analysis/service";

/**
 * Resolve the first reachable subpage of a competitor site — used by the
 * pricing and careers monitors to find e.g. /pricing or /careers without a
 * crawler. Tries each path against the site origin; returns the first with
 * enough content to be worth extracting from.
 */
export async function resolveSubpage(
  baseUrl: string,
  paths: string[],
  minLength = 400
): Promise<{ url: string; text: string } | null> {
  for (const path of paths) {
    let target: string;
    try {
      target = new URL(path, baseUrl).toString();
    } catch {
      continue;
    }
    try {
      const text = await fetchCompanyPage(target);
      if (text.length >= minLength) return { url: target, text };
    } catch {
      // 404 / blocked / timeout — try the next candidate path.
    }
  }
  return null;
}
