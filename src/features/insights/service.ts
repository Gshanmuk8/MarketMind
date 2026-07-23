import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ai } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/json";
import type { InsightType, ImpactLevel } from "@prisma/client";

/**
 * Strategy Engine — turns the raw dossier (company understanding +
 * discovered competitors + observed signals) into the strategic
 * conclusions the product is actually for: opportunities, gaps, SWOT
 * reads, and recommendations. These are always AI inferences by
 * definition (Insight model), surfaced on the competitor dossier and the
 * decision workspace.
 *
 * Regenerated whenever the company is (re)analysed, so the assessment
 * tracks new intelligence rather than reading the same every day.
 */

const INSIGHT_TYPES: InsightType[] = ["OPPORTUNITY", "GAP", "SWOT", "STRATEGY"];
const IMPACT_LEVELS: ImpactLevel[] = ["LOW", "MEDIUM", "HIGH"];

interface RawInsight {
  type?: string;
  title?: string;
  body?: string;
  impact?: string;
  /** Competitor name or domain the insight concerns, or null for market-wide. */
  competitor?: string | null;
  priority?: number;
}

/**
 * Generate and persist strategic insights for a company. Idempotent:
 * replaces the previous (non-dismissed) machine-generated set so re-runs
 * refresh the assessment instead of duplicating it. Dismissed insights
 * the founder has already actioned are left untouched.
 */
export async function generateCompanyInsights(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      industry: true,
      description: true,
      businessModel: true,
      targetAudience: true,
    },
  });
  if (!company) return { companyId, skipped: true as const };

  const competitors = await db.competitor.findMany({
    where: { companyId, status: { not: "DISMISSED" } },
    orderBy: { threatScore: { sort: "desc", nulls: "last" } },
    take: 10,
    select: { id: true, name: true, domain: true, description: true, threatScore: true },
  });

  const signals = await db.signal.findMany({
    where: { companyId },
    orderBy: { detectedAt: "desc" },
    take: 20,
    select: { title: true, category: true, severity: true },
  });

  // Nothing to reason over yet — don't invent strategy from thin air.
  if (competitors.length === 0) return { companyId, skipped: true as const, created: 0 };

  const res = await ai.complete({
    task: "strategy",
    json: true,
    temperature: 0.4,
    maxTokens: 1600,
    messages: [
      {
        role: "system",
        content:
          "You are a competitive-strategy analyst advising a founder. From the company profile, its " +
          "competitors, and observed market signals, produce the most decision-useful strategic conclusions. " +
          'Return strict JSON: { "insights": [ { ' +
          '"type": one of OPPORTUNITY|GAP|SWOT|STRATEGY, ' +
          '"title": a specific, concrete headline (<= 90 chars), ' +
          '"body": 2-4 sentences of analysis ending in a clear strategic implication, ' +
          '"impact": one of LOW|MEDIUM|HIGH, ' +
          '"competitor": the competitor name or domain this concerns (from the list) or null if market-wide, ' +
          '"priority": integer 0-100 (higher = more urgent/important) } ] }. ' +
          "Return 5-8 insights, each distinct and actionable. Every insight must answer: what should the " +
          "founder build, ignore, or do next? Ground every claim in the provided data — never fabricate metrics.",
      },
      {
        role: "user",
        content:
          `COMPANY: ${company.name ?? "unknown"} — ${company.industry ?? "unknown industry"}\n` +
          `${company.description ?? ""}\n` +
          (company.businessModel ? `Business model: ${company.businessModel}\n` : "") +
          (company.targetAudience ? `Target audience: ${company.targetAudience}\n` : "") +
          `\nCOMPETITORS (name — domain — threat 0-100):\n` +
          competitors
            .map((c) => `- ${c.name} — ${c.domain} — threat ${c.threatScore ?? "n/a"}${c.description ? `: ${c.description}` : ""}`)
            .join("\n") +
          `\n\nRECENT SIGNALS:\n${
            signals.length
              ? signals.map((s) => `- [${s.category}/${s.severity}] ${s.title}`).join("\n")
              : "(none observed yet)"
          }`,
      },
    ],
  });

  const parsed = parseAiJson<{ insights?: RawInsight[] }>(res.text);

  // Resolve a free-text competitor reference to an id we actually hold.
  const matchCompetitor = (ref?: string | null): string | null => {
    if (!ref) return null;
    const needle = ref.trim().toLowerCase();
    const hit = competitors.find(
      (c) =>
        c.name.toLowerCase() === needle ||
        c.domain.toLowerCase() === needle ||
        // Substring fallback only for refs long enough to be distinctive —
        // "ai" would otherwise match half the landscape.
        (needle.length >= 4 && c.domain.toLowerCase().includes(needle))
    );
    return hit?.id ?? null;
  };

  const clampPriority = (v: unknown) =>
    Math.min(100, Math.max(0, typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0));

  const rows = (parsed.insights ?? [])
    .filter((i): i is RawInsight & { title: string; body: string } => Boolean(i.title && i.body))
    .slice(0, 8)
    .map((i) => ({
      companyId,
      competitorId: matchCompetitor(i.competitor),
      type: INSIGHT_TYPES.includes(i.type as InsightType) ? (i.type as InsightType) : "STRATEGY",
      title: i.title.slice(0, 200),
      body: i.body,
      impact: IMPACT_LEVELS.includes(i.impact as ImpactLevel) ? (i.impact as ImpactLevel) : "MEDIUM",
      priority: clampPriority(i.priority),
    }));

  if (rows.length === 0) return { companyId, skipped: false as const, created: 0 };

  // Replace the prior machine-generated strategy set; keep anything the
  // founder dismissed AND decision-revisit insights (their own lifecycle,
  // doc 15) — those must survive a strategy refresh.
  //
  // Strategy insights have NULL `data`; a bare `NOT { data.source = ... }`
  // would leave them (SQL: NOT(NULL=x) is NULL, i.e. unmatched), so re-runs
  // would pile up duplicates. Delete NULL-data rows explicitly and spare
  // only the revisit-sourced ones.
  await db.$transaction([
    db.insight.deleteMany({
      where: {
        companyId,
        dismissed: false,
        OR: [
          { data: { equals: Prisma.AnyNull } },
          { NOT: { data: { path: ["source"], equals: "decision-revisit" } } },
        ],
      },
    }),
    db.insight.createMany({ data: rows }),
  ]);

  return { companyId, skipped: false as const, created: rows.length };
}
