import { ai } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/json";
import { extractDomain } from "@/lib/utils";
import type { CompanyAnalysis } from "@/features/company-analysis/service";

/**
 * Automatic Competitor Discovery.
 *
 * Combines AI reasoning with public search sources (Google, Product Hunt,
 * G2, Crunchbase, Reddit, GitHub) to find and rank competitors — the user
 * never has to name them.
 *
 * MVP uses pure AI reasoning over the company analysis; search-source
 * enrichment lands in the discovery milestone.
 */

export interface DiscoveredCompetitor {
  name: string;
  url: string;
  reason: string;
  /** 0–1 similarity/confidence */
  confidence: number;
}

export async function discoverCompetitors(
  analysis: CompanyAnalysis
): Promise<DiscoveredCompetitor[]> {
  const res = await ai.complete({
    task: "competitor-discovery",
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are a competitive intelligence analyst. Given a company profile, list its most likely " +
          "direct competitors. Return strict JSON: { \"competitors\": [{ \"name\", \"url\", \"reason\", " +
          "\"confidence\" (0-1) }] }. Only include real, currently operating companies. Max 10.",
      },
      {
        role: "user",
        content: JSON.stringify(analysis),
      },
    ],
  });

  const parsed = parseAiJson<{ competitors?: Partial<DiscoveredCompetitor>[] }>(res.text);
  return (parsed.competitors ?? [])
    .filter(
      (c): c is DiscoveredCompetitor =>
        typeof c.name === "string" && c.name.length > 0 && typeof c.url === "string"
    )
    // One hallucinated "url": "N/A" must not throw later and nuke the whole
    // batch — validate every URL here and drop the junk row instead.
    .filter((c) => {
      try {
        extractDomain(c.url);
        return true;
      } catch {
        return false;
      }
    })
    .map((c) => ({
      ...c,
      reason: typeof c.reason === "string" ? c.reason : "",
      confidence: Math.min(1, Math.max(0, typeof c.confidence === "number" ? c.confidence : 0.5)),
    }))
    // "Max 10" is prompt-side only — enforce it in code.
    .slice(0, 10);
}
