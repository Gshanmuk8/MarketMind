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

export class NotFoundError extends Error {}
