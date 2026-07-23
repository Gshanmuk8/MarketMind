import { inngest, Events } from "@/jobs/client";
import { generateTimeline } from "@/features/competitor-timeline/service";

/**
 * Competitor Activity Timeline generator (doc 10). Fired on demand when a
 * dossier is opened with a stale/missing cache, and by the daily refresh
 * cron. Serialized per competitor so overlapping requests don't double-run;
 * generateTimeline's freshness guard skips redundant work.
 */
export const generateCompetitorTimelineJob = inngest.createFunction(
  {
    id: "generate-competitor-timeline",
    retries: 1,
    concurrency: { key: "event.data.competitorId", limit: 1 },
  },
  { event: Events.timelineGenerateRequested },
  async ({ event, step }) => {
    const { competitorId } = event.data as { competitorId: string };
    return step.run("generate", () => generateTimeline(competitorId));
  }
);
