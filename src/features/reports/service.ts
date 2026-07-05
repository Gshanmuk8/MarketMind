import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { aiList, aiText, parseAiJson } from "@/lib/ai/json";
import type { ReportType } from "@prisma/client";

/**
 * Report Generation Engine (doc 11). Every report answers four questions —
 * what happened, what changed, why it matters, what to do — grounded
 * strictly in the period's stored rows and cited by signal id. Reports are
 * AI-reasoned by definition and rendered with inference labeling.
 */

export interface ReportSections {
  whatChanged: string[];
  threats: string[];
  opportunities: string[];
  recommendedActions: { title: string; rationale: string; priority: number }[];
  citedSignalIds: string[];
}

const PERIOD_DAYS: Record<ReportType, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
};

export async function generateReport(companyId: string, type: ReportType = "WEEKLY") {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - PERIOD_DAYS[type] * 86_400_000);

  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, name: true, industry: true, description: true },
  });
  const [signals, competitors] = await Promise.all([
    db.signal.findMany({
      where: { companyId, detectedAt: { gte: periodStart } },
      orderBy: { detectedAt: "desc" },
      take: 60,
      select: { id: true, title: true, category: true, severity: true, whyItMatters: true, competitor: { select: { name: true } } },
    }),
    db.competitor.findMany({
      where: { companyId, status: "TRACKING" },
      select: { name: true, threatScore: true, description: true },
    }),
  ]);

  // No observations, no report — an empty report is worse than none.
  if (signals.length === 0) return null;

  const res = await ai.complete({
    task: "strategy",
    json: true,
    maxTokens: 1800,
    messages: [
      {
        role: "system",
        content:
          "You are a strategy analyst writing a periodic intelligence report for a founder. Ground every claim " +
          "ONLY in the provided signals (cite by id) and competitor list — never invent facts. Return strict JSON: " +
          '{ "title": string, "executiveSummary": 3-5 sentences, "whatChanged": string[] (max 5), ' +
          '"threats": string[] (max 4), "opportunities": string[] (max 4), ' +
          '"recommendedActions": [{ "title", "rationale", "priority": 1-5 }] (max 5, priority 1 = do first), ' +
          '"citedSignalIds": string[] (ids of signals you relied on) }.',
      },
      {
        role: "user",
        content:
          `Company: ${company.name ?? "unknown"} — ${company.industry ?? ""}. ${company.description ?? ""}\n\n` +
          `Tracked competitors:\n${competitors.map((c) => `- ${c.name} (threat ${c.threatScore ?? "?"}): ${c.description ?? ""}`).join("\n")}\n\n` +
          `Signals this period:\n${signals
            .map((s) => `[${s.id}] (${s.category}/${s.severity}${s.competitor ? `, ${s.competitor.name}` : ""}) ${s.title} — ${s.whyItMatters ?? ""}`)
            .join("\n")}`,
      },
    ],
  });

  const raw = parseAiJson<Record<string, unknown>>(res.text);
  const actions = Array.isArray(raw.recommendedActions) ? raw.recommendedActions : [];
  const sections: ReportSections = {
    whatChanged: aiList(raw.whatChanged),
    threats: aiList(raw.threats),
    opportunities: aiList(raw.opportunities),
    recommendedActions: actions
      .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === "object"))
      .map((a) => ({
        title: aiText(a.title),
        rationale: aiText(a.rationale),
        priority: Math.min(5, Math.max(1, typeof a.priority === "number" ? Math.round(a.priority) : 3)),
      }))
      .filter((a) => a.title)
      .sort((a, b) => a.priority - b.priority),
    citedSignalIds: aiList(raw.citedSignalIds),
  };

  return db.report.create({
    data: {
      companyId,
      type,
      title: aiText(raw.title) || `${type.toLowerCase()} intelligence report`,
      executiveSummary: aiText(raw.executiveSummary),
      content: sections as unknown as object,
      periodStart,
      periodEnd,
    },
  });
}

export async function listReports(userId: string) {
  return db.report.findMany({
    where: { company: { userId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, executiveSummary: true, periodStart: true, periodEnd: true, createdAt: true },
  });
}

export async function getReport(userId: string, reportId: string) {
  return db.report.findFirst({
    where: { id: reportId, company: { userId } },
    include: { company: { select: { name: true } } },
  });
}
