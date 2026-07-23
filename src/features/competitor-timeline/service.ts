import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { aiList, aiText, parseAiJson } from "@/lib/ai/json";
import type {
  AdoptionIntel,
  TimelineBucket,
  TimelineCache,
  TimelineData,
  TimelineItem,
  TimelineWindow,
} from "@/features/competitor-timeline/types";

/**
 * Competitor Activity Timeline (doc 10) — generation + cache.
 *
 * One AI call, grounded in the company profile and the competitor's real
 * collected signals (bucketed by rolling window), produces the four-window
 * timeline + adoption intelligence. Cached in `Competitor.profile.timeline`
 * (no schema migration). Entirely additive; the existing signal stream and
 * analysis are read-only inputs here.
 */

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_MS: Record<TimelineWindow, number> = {
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
  year: 365 * DAY,
};
const STALE_MS = DAY; // 24h — the API enqueues a refresh past this
const FRESH_GUARD_MS = 20 * 60 * 60 * 1000; // 20h — skip regen if newer

export function isStale(cache?: TimelineCache | null): boolean {
  if (!cache?.generatedAt) return true;
  const t = Date.parse(cache.generatedAt);
  return !Number.isFinite(t) || Date.now() - t > STALE_MS;
}

function readCache(profile: unknown): TimelineCache | null {
  const p = (profile ?? {}) as { timeline?: TimelineCache };
  return p.timeline ?? null;
}

/** A timeline with nothing in any window and no adoption read is "empty". */
function isEmptyData(data?: TimelineData | null): boolean {
  if (!data) return true;
  const items = Object.values(data.buckets).reduce((n, b) => n + (b?.items?.length ?? 0), 0);
  const a = data.adoption;
  const adoption =
    a.useCases.length +
    a.popularFeatures.length +
    a.industries.length +
    a.communityThemes.length +
    a.painPoints.length +
    a.requestedFeatures.length +
    (a.sentiment ? 1 : 0);
  return items === 0 && adoption === 0;
}

/** Exposed so the API/cron can force a regen of an empty (weakly-generated) cache. */
export function isTimelineEmpty(cache?: TimelineCache | null): boolean {
  return isEmptyData(cache?.data);
}

/** Read the cached timeline for a competitor the user owns. */
export async function getTimelineForUser(userId: string, competitorId: string) {
  const competitor = await db.competitor.findFirst({
    where: { id: competitorId, company: { userId } },
    select: { id: true, profile: true },
  });
  if (!competitor) return { found: false as const };
  return { found: true as const, cache: readCache(competitor.profile) };
}

/* ── normalization (never trust raw model shape) ─────────────────────── */

const capItems = (raw: unknown): TimelineItem[] =>
  (Array.isArray(raw) ? raw : [])
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        category: aiText(o.category) || "Update",
        title: aiText(o.title),
        detail: aiText(o.detail),
        observed: o.observed === true,
      };
    })
    .filter((i) => i.title)
    .slice(0, 12);

function normalizeBucket(raw: unknown): TimelineBucket {
  const o = (raw ?? {}) as Record<string, unknown>;
  return { summary: aiText(o.summary), items: capItems(o.items) };
}

function normalizeAdoption(raw: unknown): AdoptionIntel {
  const o = (raw ?? {}) as Record<string, unknown>;
  const cap = (v: unknown) => aiList(v).slice(0, 10);
  return {
    useCases: cap(o.useCases),
    popularFeatures: cap(o.popularFeatures),
    industries: cap(o.industries),
    sentiment: aiText(o.sentiment),
    communityThemes: cap(o.communityThemes),
    painPoints: cap(o.painPoints),
    requestedFeatures: cap(o.requestedFeatures),
  };
}

function normalize(raw: Record<string, unknown>): TimelineData {
  const b = (raw.buckets ?? {}) as Record<string, unknown>;
  return {
    buckets: {
      day: normalizeBucket(b.day),
      week: normalizeBucket(b.week),
      month: normalizeBucket(b.month),
      year: normalizeBucket(b.year),
    },
    adoption: normalizeAdoption(raw.adoption),
  };
}

/**
 * Generate (or refresh) the timeline for one competitor and cache it.
 * Idempotent: skips when a fresh (<20h) cache already exists unless forced.
 */
export async function generateTimeline(competitorId: string, force = false) {
  const competitor = await db.competitor.findUnique({
    where: { id: competitorId },
    include: {
      company: { select: { name: true, industry: true, description: true } },
      signals: {
        where: { detectedAt: { gte: new Date(Date.now() - WINDOW_MS.year) } },
        orderBy: { detectedAt: "desc" },
        take: 60,
        select: { title: true, category: true, detectedAt: true, sourceName: true },
      },
    },
  });
  if (!competitor) return { competitorId, skipped: true as const };

  const cache = readCache(competitor.profile);
  if (!force && cache?.generatedAt) {
    const age = Date.now() - Date.parse(cache.generatedAt);
    if (Number.isFinite(age)) {
      const empty = isEmptyData(cache.data);
      // Fresh AND non-empty → skip. An empty cache is allowed to regenerate
      // (e.g. after a prompt improvement) but no more than every 30 min so
      // repeated views of a genuinely-unknown competitor don't hammer the AI.
      if (!empty && age < FRESH_GUARD_MS) return { competitorId, skipped: true as const, reason: "fresh" };
      if (empty && age < 30 * 60 * 1000) return { competitorId, skipped: true as const, reason: "empty-cooldown" };
    }
  }

  // Bucket the real signals we already hold, to ground the recent windows.
  const now = Date.now();
  const grouped: Record<TimelineWindow, string[]> = { day: [], week: [], month: [], year: [] };
  for (const s of competitor.signals) {
    const age = now - s.detectedAt.getTime();
    const w: TimelineWindow | null =
      age <= WINDOW_MS.day
        ? "day"
        : age <= WINDOW_MS.week
          ? "week"
          : age <= WINDOW_MS.month
            ? "month"
            : age <= WINDOW_MS.year
              ? "year"
              : null;
    if (w) grouped[w].push(`- [${s.category}] ${s.title}`);
  }
  const observedBlock = (["day", "week", "month", "year"] as TimelineWindow[])
    .map((w) => `${w.toUpperCase()}:\n${grouped[w].join("\n") || "(none observed)"}`)
    .join("\n\n");

  const res = await ai.complete({
    task: "summarization",
    json: true,
    temperature: 0.4,
    maxTokens: 2600,
    messages: [
      {
        role: "system",
        content:
          "You are a competitive-intelligence analyst compiling an ACTIVITY TIMELINE for one competitor, for a " +
          "founder tracking them. Produce four rolling windows and an adoption read. Return STRICT JSON:\n" +
          '{ "buckets": { "day": B, "week": B, "month": B, "year": B }, "adoption": {' +
          ' "useCases": string[], "popularFeatures": string[], "industries": string[], "sentiment": string,' +
          ' "communityThemes": string[], "painPoints": string[], "requestedFeatures": string[] } }\n' +
          'where each B = { "summary": string (1-2 sentences), "items": [ { "category": ' +
          'Product|Pricing|Marketing|Sales|Funding|Partnership|Hiring|Engineering|Community|Press, ' +
          '"title": specific one line, "detail": 1-2 sentences, "observed": boolean } ] }.\n' +
          "ALWAYS return a genuinely useful, populated read — never a blank timeline. Rules:\n" +
          "• OBSERVED SIGNALS below are real, verified events from our monitoring — fold them into the right " +
          "window with observed=true.\n" +
          "• 24h / 7d windows: lead with observed signals. If none, DON'T invent recent events — give a one-line " +
          "summary of the competitor's current focus and leave items empty for that window only.\n" +
          "• 30d / 365d windows: DRAW ON YOUR KNOWLEDGE of THIS company and its category to describe real, known " +
          "developments and patterns — product direction, notable launches, funding/round history, market moves, " +
          "positioning shifts — 3–6 substantive items each, observed=false. If you don't recognise the company, " +
          "infer confidently from its domain, description, and industry what a product like this does and how it " +
          "typically evolves (still observed=false).\n" +
          "• adoption: ALWAYS fill every field (3–6 entries each where possible) from public knowledge of the " +
          "product and its category — real use cases, popular features, industries, community sentiment/themes " +
          "(HN/Reddit/X), common pain points, and frequently-requested features.\n" +
          "• Be specific and concrete, never generic filler. Do NOT fabricate precise metrics, exact dates, or " +
          "dollar amounts — keep quantitative claims qualitative unless they're in the observed signals.",
      },
      {
        role: "user",
        content:
          `COMPETITOR: ${competitor.name} (${competitor.domain})` +
          `${competitor.description ? ` — ${competitor.description}` : ""}\n` +
          `TRACKED BY: ${competitor.company.name ?? "a company"} in ${competitor.company.industry ?? "their market"}.\n\n` +
          `OBSERVED SIGNALS (real, from our monitoring — group into the right window, observed=true):\n${observedBlock}`,
      },
    ],
  });

  const data = normalize(parseAiJson<Record<string, unknown>>(res.text));

  // Read-modify-write the latest profile so a concurrent monitor write isn't lost.
  const latest = await db.competitor.findUnique({
    where: { id: competitorId },
    select: { profile: true },
  });
  const profile = (latest?.profile ?? {}) as Record<string, unknown>;
  const timeline: TimelineCache = {
    data,
    generatedAt: new Date().toISOString(),
    model: res.model,
  };
  await db.competitor.update({
    where: { id: competitorId },
    data: { profile: { ...profile, timeline } as unknown as Prisma.InputJsonObject },
  });

  return { competitorId, skipped: false as const };
}
