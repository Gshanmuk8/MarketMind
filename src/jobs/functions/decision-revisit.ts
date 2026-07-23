import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { runDecisionRevisit } from "@/features/decisions/revisit";

/**
 * Decision revisit loop (doc 15): daily at 05:00 UTC — or on demand — flag
 * decisions whose revisit date has arrived, and surface market signals that
 * now contradict a recorded decision. One durable step per company so one
 * company's AI hiccup never blocks the rest.
 */
export const decisionRevisitJob = inngest.createFunction(
  { id: "decision-revisit", retries: 1, concurrency: { limit: 1 } },
  [{ cron: "0 5 * * *" }, { event: Events.decisionRevisitRequested }],
  async ({ event, step }) => {
    const companyId = (event?.data as { companyId?: string } | undefined)?.companyId;

    const companies = await step.run("load-companies", () =>
      db.company.findMany({
        where: { analysisStatus: "COMPLETE", ...(companyId ? { id: companyId } : {}) },
        select: { id: true },
      })
    );

    let flagged = 0;
    for (const company of companies) {
      const result = await step
        .run(`revisit-${company.id}`, () => runDecisionRevisit(company.id))
        .catch(() => null);
      flagged += result?.flagged ?? 0;
    }

    return { companies: companies.length, flagged };
  }
);
