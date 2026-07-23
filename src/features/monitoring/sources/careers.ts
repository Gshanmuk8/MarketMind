import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { aiText, parseAiJson } from "@/lib/ai/json";
import { enrichSignal } from "@/features/signals/intelligence";
import { recordSignal } from "@/features/signals/service";
import { resolveSubpage } from "@/features/monitoring/sources/fetch";

/**
 * Careers monitor (doc 09) — a competitor's open roles predict their
 * roadmap 3–6 months out ("hiring 3 ML engineers" ⇒ building AI). Resolves
 * the careers page, AI-extracts open roles, diffs against the cached set in
 * `Competitor.profile.careers`, and records ONE HIRING signal per sweep
 * summarizing the newly-appeared, roadmap-telling roles. First run stores a
 * silent baseline.
 */

const CAREERS_PATHS = [
  "/careers",
  "/jobs",
  "/careers/",
  "/jobs/",
  "/company/careers",
  "/about/careers",
  "/join",
  "/join-us",
];

interface Role {
  title: string;
  team?: string;
  /** Does this role reveal product/strategy direction? */
  strategic: boolean;
  /** One-line read of what it implies — only when strategic. */
  implication?: string;
}

interface CareersSnapshot {
  url: string;
  /** Normalized role titles, for cheap set-diffing. */
  roles: string[];
  checkedAt: string;
}

const norm = (title: string) => title.toLowerCase().replace(/\s+/g, " ").trim();

/** Coarse topic from the role titles, for notification filtering. */
function topicFor(titles: string[]): string {
  const blob = titles.join(" ").toLowerCase();
  if (/\b(ml|ai|machine learning|data scien|research)\b/.test(blob)) return "hiring.ai_engineer";
  if (/\b(head|vp|vice president|chief|director|lead)\b/.test(blob)) return "hiring.leadership";
  if (/\b(growth|marketing|sales|revenue|demand)\b/.test(blob)) return "hiring.growth";
  return "hiring.general";
}

async function extractRoles(pageText: string): Promise<Role[]> {
  const res = await ai.complete({
    task: "extraction",
    json: true,
    temperature: 0.1,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You read a company's careers/jobs page and list the open roles. Return strict JSON: " +
          '{ "roles": [{ "title": string, "team": string, ' +
          '"strategic": boolean (true if this role reveals product or strategy direction — e.g. a new ' +
          'product area, AI/ML investment, a new market or geo, a senior leadership hire), ' +
          '"implication": string (ONLY when strategic: one line on what it signals about their roadmap) }] }. ' +
          "List each distinct role once (max 30). If there are no open roles, return { \"roles\": [] }.",
      },
      { role: "user", content: pageText.slice(0, 14_000) },
    ],
  });

  const parsed = parseAiJson<{ roles?: Partial<Role>[] }>(res.text);
  return (parsed.roles ?? [])
    .map((r) => ({
      title: aiText(r.title),
      team: aiText(r.team) || undefined,
      strategic: r.strategic === true,
      implication: aiText(r.implication) || undefined,
    }))
    .filter((r) => r.title)
    .slice(0, 30);
}

export async function monitorCompetitorCareers(competitorId: string) {
  const competitor = await db.competitor.findUnique({
    where: { id: competitorId },
    include: {
      company: {
        select: { id: true, name: true, industry: true, description: true, keywords: true },
      },
    },
  });
  if (!competitor || competitor.status !== "TRACKING") {
    return { competitorId, skipped: true as const };
  }

  const page = await resolveSubpage(competitor.url, CAREERS_PATHS);
  if (!page) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  const roles = await extractRoles(page.text);
  if (roles.length === 0) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  const profile = (competitor.profile ?? {}) as { careers?: CareersSnapshot } & Record<
    string,
    unknown
  >;
  const previous = profile.careers;
  const snapshot: CareersSnapshot = {
    url: page.url,
    roles: roles.map((r) => norm(r.title)),
    checkedAt: new Date().toISOString(),
  };

  let signalsRecorded = 0;

  if (previous) {
    const seen = new Set(previous.roles);
    const fresh = roles.filter((r) => !seen.has(norm(r.title)));
    const strategic = fresh.filter((r) => r.strategic && r.implication);
    const titles = strategic.map((r) => r.title);
    const title =
      strategic.length === 1
        ? `${competitor.name} is hiring: ${strategic[0]!.title}`
        : `${competitor.name} is hiring ${strategic.length} strategic roles`;
    const summary = strategic
      .map((r) => `${r.title}${r.team ? ` (${r.team})` : ""} — ${r.implication}`)
      .join("; ")
      .slice(0, 600);

    // Content-aware dedupe: the summary encodes exactly which strategic roles
    // appeared, so a real new hire records while a step retry / recurring
    // title-phrasing phantom is suppressed. Retry-safe (snapshot advances after).
    const alreadyRecorded =
      strategic.length > 0 &&
      (await db.signal.findFirst({
        where: {
          competitorId: competitor.id,
          category: "HIRING",
          summary,
          detectedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      }));

    if (strategic.length > 0 && !alreadyRecorded) {
      const enrichment = await enrichSignal(
        { title, summary, category: "HIRING", competitorName: competitor.name },
        competitor.company
      );

      await recordSignal({
        companyId: competitor.company.id,
        competitorId: competitor.id,
        category: "HIRING",
        severity: enrichment.severity,
        topic: topicFor(titles),
        title,
        summary,
        whyItMatters: enrichment.whyItMatters,
        recommendation: enrichment.recommendation,
        sourceName: "Careers page",
        sourceUrl: page.url,
        // Job posts are public facts; the roadmap read is a reasoned inference.
        isInference: true,
        confidence: enrichment.confidence,
        raw: { newRoles: fresh.map((r) => r.title) },
      });
      signalsRecorded += 1;
    }
  }

  await db.competitor.update({
    where: { id: competitor.id },
    data: { profile: { ...profile, careers: snapshot } as unknown as Prisma.InputJsonObject },
  });

  return { competitorId, skipped: false as const, signalsRecorded };
}
