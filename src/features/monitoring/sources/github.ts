import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { enrichSignal } from "@/features/signals/intelligence";
import { recordSignal } from "@/features/signals/service";

/**
 * GitHub source (doc 09) — engineering signals from a competitor's public
 * repositories. Keyless (60 req/h shared limit); set GITHUB_TOKEN to raise
 * limits. Releases are verified public facts (isInference: false); the
 * Intelligence Layer still enriches every one before recordSignal.
 */

const RELEASE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface GithubRepo {
  name: string;
  full_name: string;
  stargazers_count: number;
  fork: boolean;
}

interface GithubRelease {
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
}

async function github<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      "User-Agent": "MarketMindBot/0.1 (+https://marketmind.ai)",
      Accept: "application/vnd.github+json",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, data: res.ok ? ((await res.json()) as T) : null };
}

/** Candidate org slugs derived from the competitor's identity. */
function orgCandidates(name: string, domain: string): string[] {
  const fromDomain = domain.split(".")[0] ?? "";
  const fromName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return [...new Set([fromDomain, fromName])].filter((c) => c.length >= 2);
}

/**
 * Sweep one competitor's GitHub presence for fresh releases.
 * The resolved org is cached in Competitor.profile.github.
 */
export async function monitorCompetitorGitHub(competitorId: string) {
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

  const profile = (competitor.profile ?? {}) as { github?: { org: string | null } } & Record<
    string,
    unknown
  >;

  // Resolve the org once; cache null ONLY on confirmed 404s — a rate-limit
  // (403) response must not permanently mark the competitor as org-less.
  let org = profile.github?.org;
  if (org === undefined) {
    org = null;
    let confirmed = true;
    for (const candidate of orgCandidates(competitor.name, competitor.domain)) {
      const { status, data: repos } = await github<GithubRepo[]>(
        `/orgs/${candidate}/repos?sort=pushed&per_page=6&type=public`
      );
      if (repos && repos.length > 0) {
        org = candidate;
        break;
      }
      if (status !== 404) confirmed = false; // throttled/transient — retry next sweep
    }
    if (org || confirmed) {
      await db.competitor.update({
        where: { id: competitor.id },
        data: { profile: { ...profile, github: { org } } },
      });
    }
  }
  if (!org) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  const { data: repos } = await github<GithubRepo[]>(
    `/orgs/${org}/repos?sort=pushed&per_page=6&type=public`
  );
  if (!repos) return { competitorId, skipped: false as const, signalsRecorded: 0 };

  let signalsRecorded = 0;
  const cutoff = Date.now() - RELEASE_WINDOW_MS;

  for (const repo of repos.filter((r) => !r.fork).slice(0, 4)) {
    const { data: releases } = await github<GithubRelease[]>(
      `/repos/${repo.full_name}/releases?per_page=3`
    );
    if (!releases) continue;

    for (const release of releases) {
      if (release.draft || !release.published_at) continue;
      if (new Date(release.published_at).getTime() < cutoff) continue;

      // Dedupe on the release URL — each release is recorded once per company.
      const seen = await db.signal.findFirst({
        where: { companyId: competitor.company.id, sourceUrl: release.html_url },
        select: { id: true },
      });
      if (seen) continue;

      const title = `${competitor.name} released ${release.name ?? release.tag_name} (${repo.name})`;
      const summary =
        (release.body ?? "").replace(/\r?\n+/g, " ").trim().slice(0, 400) ||
        `New ${release.prerelease ? "pre-release" : "release"} ${release.tag_name} in ${repo.full_name}.`;

      const enrichment = await enrichSignal(
        { title, summary, category: "ENGINEERING", competitorName: competitor.name },
        competitor.company
      );

      await recordSignal({
        companyId: competitor.company.id,
        competitorId: competitor.id,
        category: "ENGINEERING",
        severity: enrichment.severity,
        topic: "competitor.engineering",
        title,
        summary,
        whyItMatters: enrichment.whyItMatters,
        recommendation: enrichment.recommendation,
        sourceName: "GitHub",
        sourceUrl: release.html_url,
        // A published release is a verified public fact.
        isInference: false,
        confidence: enrichment.confidence,
      });
      signalsRecorded += 1;
    }
  }

  return { competitorId, skipped: false as const, signalsRecorded };
}
