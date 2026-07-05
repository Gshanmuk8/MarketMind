import { Inngest } from "inngest";

/**
 * Inngest client — all background pipelines run through it:
 * onboarding analysis, scheduled monitors, digests, and reports.
 */
export const inngest = new Inngest({ id: "marketmind-ai" });

/** Typed event names — the contract between API routes and jobs. */
export const Events = {
  companyAnalyzeRequested: "company/analyze.requested",
  competitorDiscoverRequested: "competitor/discover.requested",
  monitorTick: "monitor/tick",
  ecosystemSweepRequested: "ecosystem/sweep.requested",
  reportGenerate: "report/generate",
} as const;
