import { serve } from "inngest/next";

// AI steps (analysis, enrichment, reports) exceed serverless defaults — take
// the platform maximum so jobs don't die mid-step. Held at 60 (Vercel Hobby
// ceiling); each step.run is its own invocation, so this is per-step budget.
// Raise to 300 only on a plan that permits it, or the build will fail.
export const maxDuration = 60;

import { inngest } from "@/jobs/client";
import { analyzeCompanyJob } from "@/jobs/functions/analyze-company";
import { runMonitorsJob } from "@/jobs/functions/run-monitors";
import { ecosystemSweepJob } from "@/jobs/functions/ecosystem-sweep";
import { generateReportsJob } from "@/jobs/functions/generate-reports";
import { decisionRevisitJob } from "@/jobs/functions/decision-revisit";
import { generateCompetitorTimelineJob } from "@/jobs/functions/generate-competitor-timeline";
import { refreshTimelinesJob } from "@/jobs/functions/refresh-timelines";
import { sendDigestsJob } from "@/jobs/functions/send-digests";
import { instantAlertsJob } from "@/jobs/functions/instant-alerts";

/** Inngest serve endpoint — register every background function here. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeCompanyJob,
    runMonitorsJob,
    ecosystemSweepJob,
    generateReportsJob,
    decisionRevisitJob,
    generateCompetitorTimelineJob,
    refreshTimelinesJob,
    sendDigestsJob,
    instantAlertsJob,
  ],
});
