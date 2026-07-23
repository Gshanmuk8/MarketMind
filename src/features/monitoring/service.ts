import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/json";
import { fetchCompanyPage } from "@/features/company-analysis/service";
import { enrichSignal } from "@/features/signals/intelligence";
import { recordSignal } from "@/features/signals/service";
import {
  computeOpportunityScore,
  computeThreatScore,
  type ThreatFactors,
} from "@/features/scoring/service";
import type { SignalCategory } from "@prisma/client";

/**
 * Signal Collection Engine (doc 09) — the website monitor.
 *
 * For every TRACKING competitor: fetch the public site, detect change
 * against the stored watermark, extract notable events, and run each one
 * through the mandatory Intelligence Layer (enrichSignal → recordSignal).
 * Raw events never reach the Signal table unenriched.
 *
 * The watermark (content hash + excerpt) lives in Competitor.profile.monitor
 * so the engine is durable without extra infrastructure; Redis remains an
 * optional cache, never the source of truth.
 */

const EXCERPT_LENGTH = 6_000;

const VALID_CATEGORIES: SignalCategory[] = [
  "PRODUCT",
  "PRICING",
  "FUNDING",
  "HIRING",
  "TECHNOLOGY",
  "AI_MODELS",
  "ENGINEERING",
  "MARKETING",
  "SEO",
  "SOCIAL",
  "CUSTOMER",
  "PARTNERSHIP",
  "LEADERSHIP",
];

interface MonitorWatermark {
  hash: string;
  excerpt: string;
  checkedAt: string;
}

interface ExtractedEvent {
  category: SignalCategory;
  topic?: string;
  title: string;
  summary: string;
}

/** AI extraction: compare two snapshots of a competitor's site, list what changed. */
async function extractChanges(
  competitorName: string,
  previous: string,
  current: string
): Promise<ExtractedEvent[]> {
  const res = await ai.complete({
    task: "extraction",
    json: true,
    temperature: 0.1,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You compare two text snapshots of a competitor's public website and report substantive changes. " +
          'Return strict JSON: { "events": [{ "category": one of ' +
          VALID_CATEGORIES.join("|") +
          ', "topic": short key like "competitor.pricing" (optional), ' +
          '"title": one factual sentence, "summary": 1-2 factual sentences }] }. ' +
          "Only report meaningful business changes (products, pricing, positioning, hiring, partnerships). " +
          "Ignore cosmetic wording, dates, or navigation churn. Empty array if nothing substantive changed. Max 5.",
      },
      {
        role: "user",
        content: `Competitor: ${competitorName}\n\nPREVIOUS SNAPSHOT:\n${previous}\n\nCURRENT SNAPSHOT:\n${current}`,
      },
    ],
  });

  const parsed = parseAiJson<{ events?: Partial<ExtractedEvent>[] }>(res.text);
  return (parsed.events ?? [])
    .filter((e): e is ExtractedEvent => Boolean(e.title && e.summary))
    .map((e) => ({
      ...e,
      category: VALID_CATEGORIES.includes(e.category as SignalCategory)
        ? (e.category as SignalCategory)
        : "PRODUCT",
    }))
    .slice(0, 5);
}

/**
 * Monitor one competitor. First observation stores the baseline silently;
 * subsequent runs record enriched signals for every substantive change.
 */
export async function monitorCompetitor(competitorId: string) {
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

  const pageText = await fetchCompanyPage(competitor.url);
  const excerpt = pageText.slice(0, EXCERPT_LENGTH);
  const hash = createHash("sha256").update(excerpt).digest("hex");

  const profile = (competitor.profile ?? {}) as { monitor?: MonitorWatermark } & Record<
    string,
    unknown
  >;
  const previous = profile.monitor;

  let signalsRecorded = 0;
  const changed = Boolean(previous && previous.hash !== hash);

  if (previous && changed) {
    const events = await extractChanges(competitor.name, previous.excerpt, excerpt);

    for (const event of events) {
      // Retry-safe: the watermark only advances after the batch lands, so a
      // mid-loop failure replays the step — skip events already recorded.
      const duplicate = await db.signal.findFirst({
        where: {
          companyId: competitor.company.id,
          competitorId: competitor.id,
          title: event.title,
          detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (duplicate) continue;

      // The Intelligence Layer is mandatory — no raw event is ever stored.
      const enrichment = await enrichSignal(
        { ...event, category: event.category, competitorName: competitor.name },
        competitor.company
      );

      await recordSignal({
        companyId: competitor.company.id,
        competitorId: competitor.id,
        category: event.category,
        severity: enrichment.severity,
        topic: event.topic,
        title: event.title,
        summary: event.summary,
        whyItMatters: enrichment.whyItMatters,
        recommendation: enrichment.recommendation,
        sourceName: "Company website",
        sourceUrl: competitor.url,
        // AI-extracted diff of a public page — a reasoned conclusion, not a verified quote.
        isInference: true,
        confidence: enrichment.confidence,
      });
      signalsRecorded += 1;
    }
  }

  // Advance the watermark AFTER recording: advancing first silently lost the
  // whole diff whenever extraction/enrichment failed mid-step (the retry then
  // compared the new baseline against itself). The dedup check above keeps
  // replays from double-recording instead.
  await db.competitor.update({
    where: { id: competitor.id },
    data: {
      profile: { ...profile, monitor: { hash, excerpt, checkedAt: new Date().toISOString() } },
    },
  });

  return { competitorId, skipped: false as const, changed, signalsRecorded };
}

const clampFactor = (v: unknown) =>
  Math.min(100, Math.max(0, typeof v === "number" && Number.isFinite(v) ? v : 50));

const FACTOR_KEYS: (keyof ThreatFactors)[] = [
  "growth",
  "funding",
  "hiring",
  "technology",
  "featureVelocity",
  "traffic",
  "marketing",
  "customerSatisfaction",
];

function toFactors(raw: Partial<Record<keyof ThreatFactors, number>> | undefined): ThreatFactors {
  const factors = {} as ThreatFactors;
  for (const key of FACTOR_KEYS) factors[key] = clampFactor(raw?.[key]);
  return factors;
}

/**
 * Baseline threat scores for a whole company's un-scored competitors in ONE
 * AI call (onboarding fans out 10+ competitors — per-competitor calls burn
 * free-tier rate limits and stretch the pipeline by minutes). Competitors
 * the model skips get neutral factors so "Highest threat" never sits empty.
 */
export async function assessBaselineThreats(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, industry: true, description: true },
  });
  const competitors = await db.competitor.findMany({
    where: { companyId, status: { not: "DISMISSED" }, threatScore: null },
    take: 15,
    select: { id: true, name: true, domain: true, description: true },
  });
  if (!company || competitors.length === 0) {
    return { companyId, scored: 0 };
  }

  let byId = new Map<string, Partial<Record<keyof ThreatFactors, number>>>();
  try {
    const res = await ai.complete({
      task: "scoring",
      json: true,
      temperature: 0.2,
      maxTokens: Math.min(4000, 300 + competitors.length * 220),
      messages: [
        {
          role: "system",
          content:
            "You are a competitive-intelligence analyst. For EACH competitor in the list, estimate threat " +
            "factors relative to the user's company. Return strict JSON: " +
            '{ "assessments": [{ "id": the competitor id echoed VERBATIM, and integer values 0-100 for ' +
            '"growth", "funding", "hiring", "technology", "featureVelocity", "traffic", "marketing", ' +
            '"customerSatisfaction" }] }. One entry per competitor, same ids. ' +
            "Base estimates only on the provided profiles; use 50 when there is no evidence either way.",
        },
        {
          role: "user",
          content:
            `User's company: ${company.name ?? "unknown"} (${company.industry ?? "unknown industry"}). ` +
            `${company.description ?? ""}\n\nCOMPETITORS:\n` +
            competitors
              .map((c) => `- id: ${c.id} — ${c.name} (${c.domain}): ${c.description ?? "no description"}`)
              .join("\n"),
        },
      ],
    });
    const parsed = parseAiJson<{
      assessments?: ({ id?: string } & Partial<Record<keyof ThreatFactors, number>>)[];
    }>(res.text);
    byId = new Map(
      (parsed.assessments ?? [])
        .filter((a): a is { id: string } & Partial<Record<keyof ThreatFactors, number>> =>
          Boolean(a.id)
        )
        .map((a) => [a.id, a])
    );
  } catch {
    // Neutral baselines below still populate the dashboard; the next
    // per-competitor assessment refines them.
  }

  await db.$transaction(
    competitors.flatMap((competitor) => {
      const factors = toFactors(byId.get(competitor.id));
      const { score, breakdown } = computeThreatScore(factors);
      const opportunityScore = computeOpportunityScore(factors);
      return [
        db.scoreSnapshot.create({
          data: { competitorId: competitor.id, threatScore: score, opportunityScore, breakdown },
        }),
        db.competitor.update({
          where: { id: competitor.id },
          data: { threatScore: score },
        }),
      ];
    })
  );

  return { companyId, scored: competitors.length };
}

/**
 * Threat assessment: AI estimates the weighted factors from the dossier and
 * recent signals; computeThreatScore keeps the blend explainable. Persists a
 * ScoreSnapshot (full breakdown) and denormalizes the score onto the row.
 */
export async function assessCompetitorThreat(competitorId: string) {
  const competitor = await db.competitor.findUnique({
    where: { id: competitorId },
    include: {
      company: { select: { name: true, industry: true, description: true } },
      signals: { orderBy: { detectedAt: "desc" }, take: 15, select: { title: true, category: true, severity: true } },
    },
  });
  // Suggested competitors get a baseline score too — it informs the
  // track/dismiss decision. Only DISMISSED rivals are never assessed.
  if (!competitor || competitor.status === "DISMISSED") {
    return { competitorId, skipped: true as const };
  }

  const res = await ai.complete({
    task: "scoring",
    json: true,
    temperature: 0.2,
    maxTokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You are a competitive-intelligence analyst. Estimate threat factors for a competitor relative to the " +
          'user\'s company. Return strict JSON with integer values 0-100 for every key: { "growth", "funding", ' +
          '"hiring", "technology", "featureVelocity", "traffic", "marketing", "customerSatisfaction" }. ' +
          "Base estimates only on the provided profile and observed signals; use 50 when there is no evidence either way.",
      },
      {
        role: "user",
        content:
          `User's company: ${competitor.company.name ?? "unknown"} (${competitor.company.industry ?? "unknown industry"}).\n` +
          `Competitor: ${competitor.name} — ${competitor.description ?? "no description"}.\n` +
          `Recent signals:\n${
            competitor.signals.length
              ? competitor.signals
                  .map((s) => `- [${s.category}/${s.severity}] ${s.title}`)
                  .join("\n")
              : "(none observed yet)"
          }`,
      },
    ],
  });

  const raw = parseAiJson<Partial<Record<keyof ThreatFactors, number>>>(res.text);
  const factors = toFactors(raw);

  const { score, breakdown } = computeThreatScore(factors);
  const opportunityScore = computeOpportunityScore(factors);

  await db.$transaction([
    db.scoreSnapshot.create({
      data: { competitorId: competitor.id, threatScore: score, opportunityScore, breakdown },
    }),
    db.competitor.update({
      where: { id: competitor.id },
      data: { threatScore: score },
    }),
  ]);

  return { competitorId, skipped: false as const, score };
}
