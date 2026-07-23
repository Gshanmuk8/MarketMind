import { serve } from "inngest/next";

// AI steps (analysis, enrichment, reports) exceed serverless defaults —
// allow the platform maximum so jobs never die mid-step. A single step can
// bundle a page fetch + several enrichment calls; 60s killed those mid-step
// (and each provider attempt alone may take up to 90s before falling back).
export const maxDuration = 300;

import { inngest } from "@/jobs/client";
import { analyzeCompanyJob } from "@/jobs/functions/analyze-company";
import { runMonitorsJob } from "@/jobs/functions/run-monitors";
import { ecosystemSweepJob } from "@/jobs/functions/ecosystem-sweep";
import { generateReportsJob } from "@/jobs/functions/generate-reports";
import { decisionRevisitJob } from "@/jobs/functions/decision-revisit";

/** Inngest serve endpoint — register every background function here. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeCompanyJob,
    runMonitorsJob,
    ecosystemSweepJob,
    generateReportsJob,
    decisionRevisitJob,
  ],
});
