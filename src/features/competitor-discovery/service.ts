import { ai } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/json";
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
    .filter((c): c is DiscoveredCompetitor => Boolean(c.name && c.url))
    .map((c) => ({
      ...c,
      reason: c.reason ?? "",
      confidence: Math.min(1, Math.max(0, typeof c.confidence === "number" ? c.confidence : 0.5)),
    }));
}
