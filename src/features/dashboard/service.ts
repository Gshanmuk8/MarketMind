import { db } from "@/lib/db";
import { countSignalsLastDay, listRecentSignals } from "@/features/signals/service";

/**
 * The morning briefing — everything the dashboard needs, gathered in one
 * user-scoped read so the page stays a thin server component.
 */
export async function getBriefing(userId: string) {
  const company = await db.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!company) {
    return { company: null, signalsLastDay: 0, trackedCount: 0, suggestedCount: 0, topThreat: null, signals: [] as Awaited<ReturnType<typeof listRecentSignals>> };
  }

  const [signalsLastDay, trackedCount, suggestedCount, topThreat, signals] = await Promise.all([
    countSignalsLastDay(userId),
    db.competitor.count({ where: { company: { userId }, status: "TRACKING" } }),
    db.competitor.count({ where: { company: { userId }, status: "SUGGESTED" } }),
    db.competitor.findFirst({
      // Suggested rivals carry baseline scores too — the figure is never empty.
      where: { company: { userId }, status: { not: "DISMISSED" }, threatScore: { not: null } },
      orderBy: { threatScore: "desc" },
      select: { id: true, name: true, threatScore: true },
    }),
    listRecentSignals(userId, 8),
  ]);

  return { company, signalsLastDay, trackedCount, suggestedCount, topThreat, signals };
}
