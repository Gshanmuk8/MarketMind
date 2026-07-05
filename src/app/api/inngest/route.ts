import { serve } from "inngest/next";
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
