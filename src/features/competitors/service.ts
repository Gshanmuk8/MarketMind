import { db } from "@/lib/db";
import type { CompetitorStatus } from "@prisma/client";

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
    orderBy: [{ status: "desc" }, { threatScore: { sort: "desc", nulls: "last" } }, { similarityScore: "desc" }],
    include: { company: { select: { id: true, name: true } } },
  });
}

export async function getCompetitor(userId: string, competitorId: string) {
  return db.competitor.findFirst({
    where: { id: competitorId, company: { userId } },
    include: {
      signals: { orderBy: { detectedAt: "desc" }, take: 10 },
      scoreSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
  });
}

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

export class NotFoundError extends Error {}
