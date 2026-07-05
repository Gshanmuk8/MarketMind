import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { assessCompetitorThreat, monitorCompetitor } from "@/features/monitoring/service";
import { monitorCompetitorGitHub } from "@/features/monitoring/sources/github";

/**
 * The monitoring heartbeat (doc 09): every 6 hours — or on demand via
 * `monitor/tick` — sweep every TRACKING competitor of every analyzed
 * company. Each competitor is its own durable step, so one unreachable
 * site never blocks the rest of the sweep.
 */
export const runMonitorsJob = inngest.createFunction(
  {
    id: "run-monitors",
    retries: 1,
    // "Track all" fires a burst of ticks — coalesce them into one sweep and
    // never let two sweeps overlap (protects the profile watermark writes).
    debounce: { period: "30s" },
    concurrency: { limit: 1 },
  },
  [{ cron: "0 */6 * * *" }, { event: Events.monitorTick }],
  async ({ step }) => {
    const competitors = await step.run("load-tracked-competitors", () =>
      db.competitor.findMany({
        where: { status: "TRACKING", company: { analysisStatus: "COMPLETE" } },
        select: { id: true, name: true, threatScore: true },
      })
    );

    let signalsRecorded = 0;
    for (const competitor of competitors) {
      const result = await step
        .run(`monitor-${competitor.id}`, () => monitorCompetitor(competitor.id))
        // An unreachable site or model hiccup is next sweep's problem —
        // never fail the whole run for one competitor.
        .catch(() => null);

      if (!result || result.skipped) continue;
      signalsRecorded += result.signalsRecorded;

      const github = await step
        .run(`github-${competitor.id}`, () => monitorCompetitorGitHub(competitor.id))
        .catch(() => null);
      if (github && !github.skipped) signalsRecorded += github.signalsRecorded;

      // Re-assess threat when new evidence landed, or if never scored.
      if (
        result.signalsRecorded > 0 ||
        (github && !github.skipped && github.signalsRecorded > 0) ||
        competitor.threatScore == null
      ) {
        await step
          .run(`assess-${competitor.id}`, () => assessCompetitorThreat(competitor.id))
          .catch(() => null);
      }
    }

    return { competitorsChecked: competitors.length, signalsRecorded };
  }
);
