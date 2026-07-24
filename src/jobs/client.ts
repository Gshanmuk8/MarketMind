import { Inngest } from "inngest";
import { env } from "@/lib/env";

/**
 * Inngest client — all background pipelines run through it:
 * onboarding analysis, scheduled monitors, digests, and reports.
 *
 * In development we talk to the local Inngest Dev Server (started with
 * `npm run dev:inngest`); in production we send to Inngest Cloud with the
 * configured event key. Without this, `inngest.send()` defaults to Cloud
 * and 401s ("Event key not found") whenever the key is absent — which
 * surfaces in the UI as "Request failed" and leaves analysis stuck PENDING.
 */
export const inngest = new Inngest({
  id: "marketmind-ai",
  // Dev mode SKIPS incoming-webhook signature verification, so it must never
  // engage on a reachable host. Any deploy with a signing key configured runs
  // in Cloud mode (signatures enforced) regardless of NODE_ENV — only genuine
  // local dev (no signing key, non-prod) talks to the Inngest Dev Server.
  isDev: env.NODE_ENV !== "production" && !env.INNGEST_SIGNING_KEY,
  eventKey: env.INNGEST_EVENT_KEY || undefined,
});

/** Typed event names — the contract between API routes and jobs. */
export const Events = {
  companyAnalyzeRequested: "company/analyze.requested",
  monitorTick: "monitor/tick",
  ecosystemSweepRequested: "ecosystem/sweep.requested",
  reportGenerate: "report/generate",
  decisionRevisitRequested: "decision/revisit.requested",
  timelineGenerateRequested: "timeline/generate.requested",
  timelineRefreshRequested: "timeline/refresh.requested",
  signalRecorded: "signal/recorded",
} as const;
