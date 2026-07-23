import { db } from "@/lib/db";
import type { CompetitorStatus, SignalSeverity } from "@prisma/client";

/**
 * Competitor read/curation service.
 *
 * Discovery writes SUGGESTED rows (analyze-company job); the founder
 * curates them here — Track or Dismiss (doc 10, stage 3). Only TRACKING
 * competitors are monitored for signals. Every operation is user-scoped
 * through the Company relation.
 */

export type CompetitorListItem = Awaited<ReturnType<typeof listCompetitors>>[number];

export async function listCompetitors(userId: string) {
  return db.competitor.findMany({
    where: { company: { userId }, status: { not: "DISMISSED" } },
    // Enum declaration order is SUGGESTED < TRACKING — asc puts the rows the
    // founder still has to curate first, matching the "Track all" banner.
    orderBy: [{ status: "asc" }, { threatScore: { sort: "desc", nulls: "last" } }, { similarityScore: "desc" }],
    include: { company: { select: { id: true, name: true } } },
  });
}

/**
 * Full competitor dossier. Pulls everything the analysis view synthesises:
 * the signal record, strategic insights (SWOT / opportunities / gaps),
 * the live tech stack, and enough score history to show how the threat
 * assessment is moving — so the dossier reflects new intelligence as the
 * monitoring pipeline records it, rather than reading the same every day.
 */
export async function getCompetitor(userId: string, competitorId: string) {
  return db.competitor.findFirst({
    where: { id: competitorId, company: { userId } },
    include: {
      signals: { orderBy: { detectedAt: "desc" }, take: 20 },
      scoreSnapshots: { orderBy: { capturedAt: "desc" }, take: 12 },
      insights: {
        where: { dismissed: false },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      },
      techEntries: {
        where: { active: true },
        orderBy: [{ category: "asc" }, { confidence: "desc" }],
      },
    },
  });
}

export type CompetitorDossier = NonNullable<Awaited<ReturnType<typeof getCompetitor>>>;

export async function updateCompetitorStatus(
  userId: string,
  competitorId: string,
  status: CompetitorStatus
) {
  const existing = await db.competitor.findFirst({
    where: { id: competitorId, company: { userId } },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Competitor not found");

  return db.competitor.update({ where: { id: existing.id }, data: { status } });
}

/* ── per-competitor signal momentum (sparklines) ─────────────────────── */

const SPARK_WEIGHT: Record<SignalSeverity, number> = {
  INFO: 1,
  NOTABLE: 2,
  IMPORTANT: 4,
  CRITICAL: 8,
};

export interface CompetitorSpark {
  /** Daily severity-weighted signal intensity over the window. */
  spark: number[];
  trend: "up" | "down" | "flat";
  /** Most recent signal title — the "last movement". */
  last: string | null;
}

/**
 * Signal momentum per competitor for the user's landscape — so each rival
 * card can show "is this one heating up?" at a glance. One query, bucketed
 * in memory by competitor × day.
 */
export async function getCompetitorMomentum(
  userId: string,
  days = 21
): Promise<Record<string, CompetitorSpark>> {
  const DAY = 24 * 60 * 60 * 1000;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setTime(since.getTime() - (days - 1) * DAY);

  const rows = await db.signal.findMany({
    where: { company: { userId }, competitorId: { not: null }, detectedAt: { gte: since } },
    orderBy: { detectedAt: "asc" },
    select: { competitorId: true, detectedAt: true, title: true, severity: true },
  });

  const acc = new Map<string, { counts: number[]; last: string | null }>();
  for (const r of rows) {
    if (!r.competitorId) continue;
    const e = acc.get(r.competitorId) ?? { counts: new Array(days).fill(0), last: null };
    const i = Math.floor((r.detectedAt.getTime() - since.getTime()) / DAY);
    if (i >= 0 && i < days) e.counts[i] += SPARK_WEIGHT[r.severity];
    e.last = r.title; // ascending order → last write is the most recent
    acc.set(r.competitorId, e);
  }

  const out: Record<string, CompetitorSpark> = {};
  for (const [id, e] of acc) {
    const recent = e.counts.slice(days - 7).reduce((a, b) => a + b, 0);
    const prior = e.counts.slice(Math.max(0, days - 14), days - 7).reduce((a, b) => a + b, 0);
    const trend: CompetitorSpark["trend"] =
      recent > prior * 1.2 && recent > 0 ? "up" : recent < prior * 0.8 ? "down" : "flat";
    out[id] = { spark: e.counts, trend, last: e.last };
  }
  return out;
}

export class NotFoundError extends Error {}
