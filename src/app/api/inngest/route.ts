import { serve } from "inngest/next";

// AI steps (analysis, enrichment, reports) exceed serverless defaults —
// allow the platform maximum so jobs never die mid-step.
export const maxDuration = 60;

import { inngest } from "@/jobs/client";
import { analyzeCompanyJob } from "@/jobs/functions/analyze-company";
import { runMonitorsJob } from "@/jobs/functions/run-monitors";
import { ecosystemSweepJob } from "@/jobs/functions/ecosystem-sweep";
import { generateReportsJob } from "@/jobs/functions/generate-reports";

/** Inngest serve endpoint — register every background function here. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeCompanyJob, runMonitorsJob, ecosystemSweepJob, generateReportsJob],
});
