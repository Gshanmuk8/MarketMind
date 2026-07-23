import { db } from "@/lib/db";
import type { SignalCategory, SignalSeverity } from "@prisma/client";

/**
 * Signal ingestion — the single write path for every observation the
 * platform makes. All monitors (tech, hiring, pricing, GitHub, AI updates,
 * social, reviews) funnel through here, which is what makes the unified
 * dashboard feed, digests, and reports possible.
 *
 * Monitors should run enrichSignal() (intelligence.ts) first so every
 * signal carries whyItMatters + recommendation before it is stored.
 */

export interface NewSignal {
  companyId: string;
  competitorId?: string;
  category: SignalCategory;
  severity?: SignalSeverity;
  /** Fine-grained notification topic key, e.g. "tech.openai" */
  topic?: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  recommendation?: string;
  sourceName?: string;
  sourceUrl?: string;
  /** true = AI-reasoned conclusion, false = verified public fact */
  isInference?: boolean;
  confidence?: number;
  raw?: unknown;
}

export async function recordSignal(signal: NewSignal) {
  const created = await db.signal.create({
    data: {
      companyId: signal.companyId,
      competitorId: signal.competitorId,
      category: signal.category,
      severity: signal.severity ?? "INFO",
      topic: signal.topic,
      title: signal.title,
      summary: signal.summary,
      whyItMatters: signal.whyItMatters,
      recommendation: signal.recommendation,
      sourceName: signal.sourceName,
      sourceUrl: signal.sourceUrl,
      isInference: signal.isInference ?? false,
      confidence: signal.confidence,
      raw: signal.raw as object | undefined,
    },
  });

  return created;
}

/** A signal joined with the competitor it concerns, for feed rendering. */
export type SignalWithCompetitor = Awaited<ReturnType<typeof listRecentSignals>>[number];

/** Latest signals across all of the user's companies — the briefing feed. */
export async function listRecentSignals(userId: string, limit = 8) {
  return db.signal.findMany({
    where: { company: { userId } },
    orderBy: { detectedAt: "desc" },
    take: limit,
    include: { competitor: { select: { name: true } } },
  });
}

/** Category-scoped feed (Technology, AI Intelligence pages). */
export async function listSignalsByCategory(
  userId: string,
  categories: SignalCategory[],
  limit = 30
) {
  return db.signal.findMany({
    where: { company: { userId }, category: { in: categories } },
    orderBy: { detectedAt: "desc" },
    take: limit,
    include: { competitor: { select: { name: true } } },
  });
}

/** Signals observed in the trailing 24 hours, across the user's companies. */
export async function countSignalsLastDay(userId: string): Promise<number> {
  return db.signal.count({
    where: {
      company: { userId },
      detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
}

/** Signals observed since a given instant — powers "new since your last visit". */
export async function countSignalsSince(userId: string, since: Date): Promise<number> {
  return db.signal.count({
    where: { company: { userId }, detectedAt: { gt: since } },
  });
}
