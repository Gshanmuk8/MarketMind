import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import {
  collectEcosystemItems,
  sweepEcosystemForCompany,
} from "@/features/monitoring/sources/ecosystem";

/**
 * Ecosystem sweep (doc 09): every 6 hours — or on demand — read the tech,
 * AI-provider, and research feeds once, then AI-filter them per analyzed
 * company into market-wide signals. Feeds the Technology and AI
 * Intelligence pages and every user's digests.
 */
export const ecosystemSweepJob = inngest.createFunction(
  // Serialized: the sourceUrl dedup inside sweepEcosystemForCompany is
  // check-then-insert — two concurrent runs (cron + onboarding chain)
  // would both pass the check and double-record the same headline.
  { id: "ecosystem-sweep", retries: 1, concurrency: { limit: 1 } },
  [{ cron: "15 */6 * * *" }, { event: Events.ecosystemSweepRequested }],
  async ({ event, step }) => {
    // Onboarding chains a sweep for ONE company; only the cron does everyone.
    const companyId = (event?.data as { companyId?: string } | undefined)?.companyId;

    const items = await step.run("collect-feeds", () => collectEcosystemItems());
    if (items.length === 0) return { items: 0, companies: 0, signalsRecorded: 0 };

    const companies = await step.run("load-companies", () =>
      db.company.findMany({
        where: { analysisStatus: "COMPLETE", ...(companyId ? { id: companyId } : {}) },
        select: { id: true },
      })
    );

    let signalsRecorded = 0;
    for (const company of companies) {
      const result = await step
        .run(`sweep-${company.id}`, () => sweepEcosystemForCompany(company.id, items))
        // One company's model hiccup never blocks the rest.
        .catch(() => null);
      signalsRecorded += result?.signalsRecorded ?? 0;
    }

    return { items: items.length, companies: companies.length, signalsRecorded };
  }
);
