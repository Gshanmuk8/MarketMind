import { ai } from "@/lib/ai";
import { aiList, aiText, parseAiJson } from "@/lib/ai/json";

/**
 * AI Company Understanding Engine.
 *
 * Given a company URL, produce a structured understanding: industry, ICP,
 * features, business model, keywords. This is the first stage of the
 * onboarding pipeline and the anchor for competitor discovery.
 */

export interface CompanyAnalysis {
  name: string;
  industry: string;
  description: string;
  businessModel: string;
  targetAudience: string;
  features: string[];
  keywords: string[];
  technologies: string[];
}

export async function analyzeCompany(url: string, pageText: string): Promise<CompanyAnalysis> {
  const res = await ai.complete({
    task: "company-analysis",
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are a market analyst. Given a company's website content, return strict JSON with keys: " +
          "name, industry, description, businessModel, targetAudience, features (string[]), " +
          "keywords (string[]), technologies (string[]). Be precise and concise.",
      },
      {
        role: "user",
        content: pageText
          ? `Company URL: ${url}\n\nWebsite content:\n${pageText.slice(0, 24_000)}`
          : `Company URL: ${url}\n\nThe website could not be fetched (bot-blocked or unreachable). ` +
            `Analyze this company from your own knowledge of the domain. If you don't recognize it, ` +
            `derive what you conservatively can from the domain name and say so in the description.`,
      },
    ],
  });

  // Models drift on shape (arrays where prose is expected, etc.) —
  // normalize every field so the schema, not the model, decides types.
  const raw = parseAiJson<Record<string, unknown>>(res.text);
  return {
    name: aiText(raw.name),
    industry: aiText(raw.industry),
    description: aiText(raw.description),
    businessModel: aiText(raw.businessModel),
    targetAudience: aiText(raw.targetAudience),
    features: aiList(raw.features),
    keywords: aiList(raw.keywords),
    technologies: aiList(raw.technologies),
  };
}

/**
 * Fetch and roughly de-tag a company's public homepage.
 * TODO: replace with a proper crawler (multiple pages, pricing page, sitemap).
 */
export async function fetchCompanyPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MarketMindBot/0.1 (+https://marketmind.ai)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en",
    },
    // A hanging site must not stall the onboarding pipeline.
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Could not fetch ${url}: ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
