import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { generateReport } from "@/features/reports/service";
import type { ReportType } from "@prisma/client";

/**
 * Weekly report run (doc 11): every Monday 06:00 UTC, plus on-demand via
 * `report/generate` (optionally scoped to one company). Companies with no
 * signals in the period are skipped — empty reports are never written.
 */
export const generateReportsJob = inngest.createFunction(
  { id: "generate-reports", retries: 1 },
  [{ cron: "0 6 * * 1" }, { event: Events.reportGenerate }],
  async ({ event, step }) => {
    const data = (event?.data ?? {}) as { companyId?: string; type?: ReportType };

    const companies = await step.run("load-companies", () =>
      db.company.findMany({
        where: data.companyId
          ? { id: data.companyId, analysisStatus: "COMPLETE" }
          : { analysisStatus: "COMPLETE" },
        select: { id: true },
      })
    );

    let generated = 0;
    for (const company of companies) {
      const report = await step
        .run(`report-${company.id}`, () => generateReport(company.id, data.type ?? "WEEKLY"))
        .catch(() => null);
      if (report) generated += 1;
    }

    return { companies: companies.length, generated };
  }
);
