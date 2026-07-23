import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { generateReport } from "@/features/reports/service";
import { deliverReport } from "@/features/notifications/service";
import { isCompetitiveTarget, type WebsiteCategory } from "@/features/company-analysis/service";
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

    const companies = await step.run("load-companies", async () => {
      const rows = await db.company.findMany({
        where: data.companyId
          ? { id: data.companyId, analysisStatus: "COMPLETE" }
          : { analysisStatus: "COMPLETE" },
        select: { id: true, analysis: true },
      });
      // No reports for personal sites / blogs / unknown pages — nothing to
      // report on. Legacy rows without a classification keep working.
      return rows
        .filter((c) => {
          const a = (c.analysis ?? {}) as { category?: WebsiteCategory; confidence?: number };
          return !a.category || isCompetitiveTarget({ category: a.category, confidence: a.confidence ?? 0 });
        })
        .map((c) => ({ id: c.id }));
    });

    let generated = 0;
    let delivered = 0;
    for (const company of companies) {
      const report = await step
        .run(`report-${company.id}`, () => generateReport(company.id, data.type ?? "WEEKLY"))
        .catch(() => null);
      if (!report) continue;
      generated += 1;

      // Deliver the Monday Morning Memo to the user's channels (doc 12).
      // Own step so a retry never re-sends; best-effort so a delivery
      // failure never fails report generation.
      const result = await step
        .run(`deliver-${report.id}`, () => deliverReport(report.id))
        .catch(() => null);
      delivered += result?.delivered ?? 0;
    }

    return { companies: companies.length, generated, delivered };
  }
);
