import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { isStale } from "@/features/competitor-timeline/service";
import type { TimelineCache } from "@/features/competitor-timeline/types";

/**
 * Daily rolling refresh (doc 10): keep every TRACKING competitor's activity
 * timeline current without a visit. Enqueues generation only for stale
 * (>24h) or never-generated caches, so the four rolling windows always
 * reflect the latest 24h / 7d / 30d / 365d. Bounded per run.
 */
export const refreshTimelinesJob = inngest.createFunction(
  { id: "refresh-timelines", retries: 1, concurrency: { limit: 1 } },
  [{ cron: "30 4 * * *" }, { event: Events.timelineRefreshRequested }],
  async ({ step }) => {
    const competitors = await step.run("load-tracked", () =>
      db.competitor.findMany({
        where: { status: "TRACKING", company: { analysisStatus: "COMPLETE" } },
        take: 200,
        select: { id: true, profile: true },
      })
    );

    const stale = competitors.filter((c) => {
      const cache = ((c.profile ?? {}) as { timeline?: TimelineCache }).timeline ?? null;
      return isStale(cache);
    });

    for (const competitor of stale) {
      await step.sendEvent(`enqueue-${competitor.id}`, {
        name: Events.timelineGenerateRequested,
        data: { competitorId: competitor.id },
      });
    }

    return { tracked: competitors.length, enqueued: stale.length };
  }
);
