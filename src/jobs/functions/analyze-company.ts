import { inngest, Events } from "@/jobs/client";
import { db } from "@/lib/db";
import { analyzeCompany, fetchCompanyPage } from "@/features/company-analysis/service";
import { discoverCompetitors } from "@/features/competitor-discovery/service";
import { assessCompetitorThreat } from "@/features/monitoring/service";
import { extractDomain } from "@/lib/utils";

/**
 * Onboarding pipeline: fetch site → AI understanding → competitor discovery.
 * Each step is durable and independently retried by Inngest.
 */
export const analyzeCompanyJob = inngest.createFunction(
  {
    id: "analyze-company",
    retries: 2,
    // After all retries are exhausted, never leave the company stuck in
    // ANALYZING — mark it FAILED so the UI can offer a retry.
    onFailure: async ({ event }) => {
      const { companyId } = event.data.event.data as { companyId: string };
      await db.company
        .update({ where: { id: companyId }, data: { analysisStatus: "FAILED" } })
        .catch(() => undefined); // company may have been deleted meanwhile
    },
  },
  { event: Events.companyAnalyzeRequested },
  async ({ event, step }) => {
    const { companyId } = event.data as { companyId: string };

    const company = await step.run("load-company", () =>
      db.company.findUniqueOrThrow({ where: { id: companyId } })
    );

    await step.run("mark-analyzing", () =>
      db.company.update({ where: { id: companyId }, data: { analysisStatus: "ANALYZING" } })
    );

    // Bot-blocked sites (403s, Cloudflare) must not fail onboarding — the
    // AI falls back to its own knowledge of the company.
    const pageText = await step
      .run("fetch-site", () => fetchCompanyPage(company.url))
      .catch(() => "");

    const analysis = await step.run("ai-understanding", () =>
      analyzeCompany(company.url, pageText)
    );

    await step.run("save-analysis", () =>
      db.company.update({
        where: { id: companyId },
        data: {
          name: analysis.name,
          industry: analysis.industry,
          description: analysis.description,
          businessModel: analysis.businessModel,
          targetAudience: analysis.targetAudience,
          keywords: analysis.keywords,
          analysis: analysis as unknown as object,
          analysisStatus: "COMPLETE",
        },
      })
    );

    const competitors = await step.run("discover-competitors", () =>
      discoverCompetitors(analysis)
    );

    await step.run("save-competitors", () =>
      db.competitor.createMany({
        data: competitors.map((c) => ({
          companyId,
          name: c.name,
          url: c.url,
          domain: extractDomain(c.url),
          description: c.reason,
          similarityScore: c.confidence,
          status: "SUGGESTED" as const,
        })),
        skipDuplicates: true,
      })
    );

    // Baseline threat scores for every discovered competitor — "Highest
    // threat" must never sit empty, and scores inform track/dismiss.
    const discovered = await step.run("load-discovered", () =>
      db.competitor.findMany({
        where: { companyId, status: "SUGGESTED", threatScore: null },
        select: { id: true },
      })
    );
    for (const competitor of discovered) {
      await step
        .run(`baseline-threat-${competitor.id}`, () =>
          assessCompetitorThreat(competitor.id)
        )
        .catch(() => null);
    }

    // Chain a market sweep immediately so the dashboard has signals within
    // minutes of onboarding — never an empty briefing until the next cron.
    await step.sendEvent("kick-ecosystem-sweep", {
      name: Events.ecosystemSweepRequested,
      data: {},
    });

    return { companyId, competitorsFound: competitors.length };
  }
);
