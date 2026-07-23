import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { assessCompetitorThreat, monitorCompetitor } from "@/features/monitoring/service";
import { monitorCompetitorGitHub } from "@/features/monitoring/sources/github";
import { monitorCompetitorPricing } from "@/features/monitoring/sources/pricing";
import { monitorCompetitorCareers } from "@/features/monitoring/sources/careers";

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
  async ({ event, step }) => {
    // An on-demand tick carries the acting user's companyId; the cron omits it
    // (sweeps everyone). Never let a single "Track" fan out across all tenants.
    const companyId = (event?.data as { companyId?: string } | undefined)?.companyId;

    const competitors = await step.run("load-tracked-competitors", () =>
      db.competitor.findMany({
        where: {
          status: "TRACKING",
          company: { analysisStatus: "COMPLETE" },
          ...(companyId ? { companyId } : {}),
        },
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

      // `skipped` = no longer TRACKING; a monitor *error* (null) must not
      // disable the competitor's other sources — a bot-blocked website
      // would otherwise permanently silence GitHub + threat assessment.
      if (result?.skipped) continue;
      const websiteSignals = result?.signalsRecorded ?? 0;
      signalsRecorded += websiteSignals;

      const github = await step
        .run(`github-${competitor.id}`, () => monitorCompetitorGitHub(competitor.id))
        .catch(() => null);
      if (github && !github.skipped) signalsRecorded += github.signalsRecorded;

      // Pricing page — the highest-signal change a competitor can make.
      const pricing = await step
        .run(`pricing-${competitor.id}`, () => monitorCompetitorPricing(competitor.id))
        .catch(() => null);
      const pricingSignals = pricing && !pricing.skipped ? pricing.signalsRecorded : 0;
      signalsRecorded += pricingSignals;

      // Careers page — open roles predict the roadmap months ahead.
      const careers = await step
        .run(`careers-${competitor.id}`, () => monitorCompetitorCareers(competitor.id))
        .catch(() => null);
      const careersSignals = careers && !careers.skipped ? careers.signalsRecorded : 0;
      signalsRecorded += careersSignals;

      // Re-assess threat when new evidence landed, or if never scored.
      if (
        websiteSignals > 0 ||
        (github && !github.skipped && github.signalsRecorded > 0) ||
        pricingSignals > 0 ||
        careersSignals > 0 ||
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
