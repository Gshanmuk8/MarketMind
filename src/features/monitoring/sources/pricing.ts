import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { aiList, aiText, parseAiJson } from "@/lib/ai/json";
import { enrichSignal } from "@/features/signals/intelligence";
import { recordSignal } from "@/features/signals/service";
import { resolveSubpage } from "@/features/monitoring/sources/fetch";

/**
 * Pricing monitor (doc 09) — the highest-signal page on any SaaS site.
 * Resolves the competitor's pricing page, AI-extracts a STRUCTURED plan
 * snapshot, and diffs it against the cached snapshot in
 * `Competitor.profile.pricing`. Plan/price changes are recorded as PRICING
 * signals; the extracted diff is an inference. First run stores a silent
 * baseline.
 */

const PRICING_PATHS = ["/pricing", "/plans", "/pricing-plans", "/pricing/", "/plans/"];

interface PricingPlan {
  name: string;
  /** As shown, e.g. "$12/mo", "Free", "Custom". */
  price: string;
  cadence?: string;
  highlights?: string[];
}

interface PricingSnapshot {
  url: string;
  plans: PricingPlan[];
  checkedAt: string;
}

/** Normalize a plan/price so cosmetic rewording doesn't read as a change. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/per month|\/month|monthly|p\/m/g, "/mo")
    .replace(/per year|\/year|annually|yearly|p\/y/g, "/yr")
    .replace(/\s+/g, "")
    .trim();
}

function priceMap(plans: PricingPlan[]): Map<string, string> {
  return new Map(plans.map((p) => [norm(p.name), norm(`${p.price}${p.cadence ?? ""}`)]));
}

/** Human diff of two plan snapshots; empty string means no substantive change. */
function diffPlans(previous: PricingPlan[], current: PricingPlan[]): string {
  const before = priceMap(previous);
  const after = priceMap(current);
  const nameOf = new Map(current.map((p) => [norm(p.name), p.name]));
  const prevNameOf = new Map(previous.map((p) => [norm(p.name), p.name]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [key, price] of after) {
    if (!before.has(key)) added.push(`${nameOf.get(key)} (${price})`);
    else if (before.get(key) !== price)
      changed.push(`${nameOf.get(key)}: ${before.get(key)} → ${price}`);
  }
  for (const [key] of before) {
    if (!after.has(key)) removed.push(prevNameOf.get(key) ?? key);
  }

  const parts: string[] = [];
  if (changed.length) parts.push(`Price changes — ${changed.join("; ")}`);
  if (added.length) parts.push(`New plans — ${added.join(", ")}`);
  if (removed.length) parts.push(`Removed plans — ${removed.join(", ")}`);
  return parts.join(". ");
}

async function extractPlans(pageText: string): Promise<PricingPlan[]> {
  const res = await ai.complete({
    task: "extraction",
    json: true,
    temperature: 0.1,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You extract a SaaS pricing table into structured JSON. Return strict JSON: " +
          '{ "plans": [{ "name": string, "price": string as shown (e.g. "$12/mo", "Free", "Custom"), ' +
          '"cadence": "monthly"|"yearly"|"one-time"|"" , "highlights": string[] (up to 3 headline features) }] }. ' +
          "List every distinct plan tier. If the page has no pricing, return { \"plans\": [] }.",
      },
      { role: "user", content: pageText.slice(0, 12_000) },
    ],
  });

  const parsed = parseAiJson<{ plans?: Partial<PricingPlan>[] }>(res.text);
  return (parsed.plans ?? [])
    .map((p) => ({
      name: aiText(p.name),
      price: aiText(p.price),
      cadence: aiText(p.cadence) || undefined,
      highlights: aiList(p.highlights).slice(0, 3),
    }))
    .filter((p) => p.name && p.price);
}

export async function monitorCompetitorPricing(competitorId: string) {
  const competitor = await db.competitor.findUnique({
    where: { id: competitorId },
    include: {
      company: {
        select: { id: true, name: true, industry: true, description: true, keywords: true },
      },
    },
  });
  if (!competitor || competitor.status !== "TRACKING") {
    return { competitorId, skipped: true as const };
  }

  const page = await resolveSubpage(competitor.url, PRICING_PATHS);
  if (!page) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  const plans = await extractPlans(page.text);
  if (plans.length === 0) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  const profile = (competitor.profile ?? {}) as { pricing?: PricingSnapshot } & Record<
    string,
    unknown
  >;
  const previous = profile.pricing;
  const snapshot: PricingSnapshot = { url: page.url, plans, checkedAt: new Date().toISOString() };

  let signalsRecorded = 0;

  if (previous) {
    const diff = diffPlans(previous.plans, plans);
    const summary = diff.slice(0, 600);
    // Content-aware dedupe: match the exact diff, not just the page. A
    // genuinely different change has a different summary and still records;
    // an identical one (a step retry, or a recurring extraction phantom) is
    // suppressed. Retry-safe because the snapshot advances only after this.
    const alreadyRecorded =
      diff &&
      (await db.signal.findFirst({
        where: {
          competitorId: competitor.id,
          category: "PRICING",
          summary,
          detectedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      }));

    if (diff && !alreadyRecorded) {
      // Denormalize a readable current summary onto the row for the dossier.
      const pricingSummary = plans
        .map((p) => `${p.name} ${p.price}`)
        .join(" · ")
        .slice(0, 200);

      const title = `${competitor.name} changed pricing`;

      const enrichment = await enrichSignal(
        { title, summary, category: "PRICING", competitorName: competitor.name },
        competitor.company
      );

      await recordSignal({
        companyId: competitor.company.id,
        competitorId: competitor.id,
        category: "PRICING",
        severity: enrichment.severity,
        topic: "competitor.pricing",
        title,
        summary,
        whyItMatters: enrichment.whyItMatters,
        recommendation: enrichment.recommendation,
        sourceName: "Pricing page",
        sourceUrl: page.url,
        // Extracted from a public page, but the structured diff is a reasoned
        // reading, not a verbatim quote.
        isInference: true,
        confidence: enrichment.confidence,
        raw: { previous: previous.plans, current: plans },
      });
      signalsRecorded += 1;

      await db.competitor.update({
        where: { id: competitor.id },
        data: { pricingSummary },
      });
    }
  }

  // Advance the snapshot after recording (retry-safe: the diff above is
  // recomputed against the same baseline until a signal actually lands).
  await db.competitor.update({
    where: { id: competitor.id },
    data: { profile: { ...profile, pricing: snapshot } as unknown as Prisma.InputJsonObject },
  });

  return { competitorId, skipped: false as const, signalsRecorded };
}
