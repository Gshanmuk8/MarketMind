import { ai } from "@/lib/ai";
import { aiList, aiText, parseAiJson } from "@/lib/ai/json";

/**
 * AI Company Understanding Engine.
 *
 * Given a URL, first CLASSIFY what kind of site it is, then produce a
 * structured understanding appropriate to that type. Competitive
 * intelligence (competitor discovery, threat scoring, strategy) only makes
 * sense for actual companies/products — so the pipeline gates on the
 * classification and never fabricates enterprise analysis for a personal
 * site, blog, or unknown page.
 */

/** What kind of site the URL points at — drives how (and whether) we analyse it. */
export type WebsiteCategory =
  | "ENTERPRISE" // established company / larger org
  | "STARTUP" // early / growth-stage company
  | "PRODUCT" // a specific product, app, or service
  | "PERSONAL" // an individual's site, portfolio, or résumé
  | "BLOG" // blog / media / newsletter / content site
  | "UNKNOWN"; // parked, thin, unreachable, or indeterminate

export const CATEGORY_LABEL: Record<WebsiteCategory, string> = {
  ENTERPRISE: "Company",
  STARTUP: "Startup",
  PRODUCT: "Product",
  PERSONAL: "Personal site",
  BLOG: "Blog / media",
  UNKNOWN: "Unverified",
};

const WEBSITE_CATEGORIES: WebsiteCategory[] = [
  "ENTERPRISE",
  "STARTUP",
  "PRODUCT",
  "PERSONAL",
  "BLOG",
  "UNKNOWN",
];

export interface CompanyAnalysis {
  /** Site classification (drives the pipeline). */
  category: WebsiteCategory;
  /** 0–1 confidence in the classification. */
  confidence: number;
  /** One-line reason for the classification. */
  classification: string;
  name: string;
  industry: string;
  description: string;
  businessModel: string;
  targetAudience: string;
  features: string[];
  keywords: string[];
  technologies: string[];
}

/**
 * True when the site is a real competitive target worth running discovery,
 * threat scoring, and strategy on. Personal sites, blogs, and low-confidence
 * / unknown pages are understood but NOT given fabricated enterprise
 * intelligence.
 */
export function isCompetitiveTarget(analysis: Pick<CompanyAnalysis, "category" | "confidence">): boolean {
  return (
    (analysis.category === "ENTERPRISE" ||
      analysis.category === "STARTUP" ||
      analysis.category === "PRODUCT") &&
    analysis.confidence >= 0.4
  );
}

export async function analyzeCompany(url: string, pageText: string): Promise<CompanyAnalysis> {
  const res = await ai.complete({
    task: "company-analysis",
    json: true,
    // Bound the anchor step — verbose models on a content-rich site can blow
    // the default budget and truncate the JSON, failing the whole onboarding.
    maxTokens: 1800,
    messages: [
      {
        role: "system",
        content:
          "You are a market analyst. FIRST classify what kind of website this is, THEN describe it — " +
          "producing only analysis that genuinely fits that type. Return strict JSON with keys: " +
          '"category" (one of ENTERPRISE, STARTUP, PRODUCT, PERSONAL, BLOG, UNKNOWN), ' +
          '"confidence" (0-1, your confidence in the category), ' +
          '"classification" (one short sentence: what this site is and why), ' +
          '"name", "industry", "description", "businessModel", "targetAudience", ' +
          '"features" (string[]), "keywords" (string[]), "technologies" (string[]).\n' +
          "Category guide: ENTERPRISE = an established company/organisation with products or services; " +
          "STARTUP = an early or growth-stage company; PRODUCT = a single product, app, or service page; " +
          "PERSONAL = an individual's personal site, portfolio, or résumé; BLOG = a blog, newsletter, or " +
          "media/content site; UNKNOWN = parked, placeholder, thin, error, or impossible to determine.\n" +
          "Rules: Only ENTERPRISE/STARTUP/PRODUCT are businesses — for those, fill businessModel, " +
          "targetAudience, features, and keywords fully. For PERSONAL/BLOG, adapt: name = the person or " +
          "publication, industry = their field/topic, description = a factual summary, and leave " +
          "businessModel/targetAudience empty ('') if not applicable. For UNKNOWN, be honest and minimal. " +
          "NEVER invent a business model, competitors, funding, or metrics for a site that isn't a company. " +
          "Be precise and concise; never fabricate. Cap arrays: max 12 features, 15 keywords, 10 technologies.",
      },
      {
        role: "user",
        content: pageText
          ? `URL: ${url}\n\nWebsite content:\n${pageText.slice(0, 24_000)}`
          : `URL: ${url}\n\nThe website could not be fetched (bot-blocked or unreachable). ` +
            `Classify and analyze from your own knowledge of the domain. If you don't recognize it, ` +
            `set category to UNKNOWN with low confidence and derive only what the domain name conservatively ` +
            `supports — do not invent a company.`,
      },
    ],
  });

  // Models drift on shape (arrays where prose is expected, etc.) —
  // normalize every field so the schema, not the model, decides types.
  const raw = parseAiJson<Record<string, unknown>>(res.text);
  const category = WEBSITE_CATEGORIES.includes(String(raw.category).toUpperCase() as WebsiteCategory)
    ? (String(raw.category).toUpperCase() as WebsiteCategory)
    : "UNKNOWN";
  const rawConfidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : category === "UNKNOWN"
        ? 0.3
        : 0.6;

  // A site we couldn't fetch cannot be classified from a knowledge guess —
  // force UNKNOWN + low confidence so it can never green-light fabricated
  // competitor intelligence for what might be a personal site or blog.
  const noPage = !pageText.trim();
  const category2 = noPage ? "UNKNOWN" : category;
  const confidence = noPage ? Math.min(rawConfidence, 0.3) : rawConfidence;

  return {
    category: category2,
    confidence,
    classification: noPage
      ? aiText(raw.classification) || "The site couldn't be read, so it can't be verified as a company."
      : aiText(raw.classification),
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
  // Guard against multi-hundred-MB responses buffering into memory.
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > 5_000_000) throw new Error(`Page too large: ${url}`);
  const html = (await res.text()).slice(0, 5_000_000);
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
