import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Activity, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SignalEntry } from "@/components/shared/signal-entry";
import { getSessionUser } from "@/lib/session";
import { getCompetitor } from "@/features/competitors/service";
import type { InsightType, ImpactLevel } from "@prisma/client";

export const metadata: Metadata = { title: "Competitor profile" };

/* ── small presentational helpers ─────────────────────────────────── */

/** camelCase / snake_case factor key → "Feature velocity". */
function humanize(key: string) {
  const s = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const INSIGHT_LABEL: Record<InsightType, string> = {
  OPPORTUNITY: "Opportunity",
  GAP: "Gap",
  SWOT: "SWOT",
  STRATEGY: "Strategy",
};

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  LOW: "Low impact",
  MEDIUM: "Medium impact",
  HIGH: "High impact",
};

const TECH_LABEL: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  DATABASE: "Database",
  CLOUD: "Cloud",
  DEVOPS: "DevOps",
  AI: "AI",
  ANALYTICS: "Analytics",
  OTHER: "Other",
};

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Full competitor dossier: an analyst's read — positioning, threat &
 *  opportunity assessment, strategic insights, technology, and the
 *  evolving development record. */
export default async function CompetitorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const competitor = await getCompetitor(user.id, id);
  if (!competitor) notFound();

  const snapshot = competitor.scoreSnapshots[0];
  const previous = competitor.scoreSnapshots[1];
  const breakdown = (snapshot?.breakdown ?? null) as Record<string, number> | null;
  const factors = breakdown
    ? Object.entries(breakdown)
        .filter(([, v]) => typeof v === "number")
        .sort((a, b) => b[1] - a[1])
    : [];
  const factorMax = factors.length ? Math.max(...factors.map(([, v]) => v)) : 0;

  const threat = snapshot?.threatScore ?? competitor.threatScore ?? null;
  const opportunity = snapshot?.opportunityScore ?? null;
  const threatDelta = snapshot && previous ? snapshot.threatScore - previous.threatScore : null;

  const lead = competitor.insights[0] ?? null;
  const restInsights = lead ? competitor.insights.slice(1) : competitor.insights;
  const latestSignal = competitor.signals[0] ?? null;

  // Live tech stack grouped by category.
  const techByCategory = new Map<string, string[]>();
  for (const t of competitor.techEntries) {
    const list = techByCategory.get(t.category) ?? [];
    list.push(t.name);
    techByCategory.set(t.category, list);
  }

  // Header facts strip — only what we actually know.
  const facts = [
    competitor.marketPosition && { label: "Position", value: competitor.marketPosition },
    competitor.fundingStage && { label: "Funding", value: competitor.fundingStage },
    competitor.employeeRange && { label: "Headcount", value: competitor.employeeRange },
    competitor.pricingSummary && { label: "Pricing", value: competitor.pricingSummary },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <PageHeader eyebrow={`Dossier · ${competitor.domain}`} title={competitor.name}>
        {competitor.status === "TRACKING" ? (
          <Badge variant="live">Tracking</Badge>
        ) : (
          <Badge>{competitor.status.toLowerCase()}</Badge>
        )}
      </PageHeader>

      {/* Facts strip — architectural definition row */}
      {facts.length > 0 && (
        <dl className="mb-12 grid grid-cols-2 gap-x-8 gap-y-6 border-b border-border pb-8 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="microlabel mb-2">{f.label}</dt>
              <dd className="font-sans text-sm text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Lead assessment — the top strategic insight, set as a standfirst */}
      {lead && (
        <section className="mb-14 max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="microlabel text-accent">{INSIGHT_LABEL[lead.type]}</span>
            <Badge variant="inference">AI assessment</Badge>
          </div>
          <p className="font-display text-2xl leading-snug text-foreground sm:text-3xl">
            {lead.title}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{lead.body}</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Annotation column — the numbers, read as information design */}
        <aside className="lg:col-span-4">
          {competitor.description && (
            <p className="text-sm leading-relaxed text-muted">{competitor.description}</p>
          )}

          {/* Threat & opportunity */}
          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6">
            <div>
              <p className="microlabel mb-2">Threat</p>
              <p className="font-display text-5xl text-foreground">
                {threat ?? "—"}
                {threat != null && <span className="text-lg text-faint"> /100</span>}
              </p>
              {threatDelta != null && threatDelta !== 0 && (
                <p className="font-data mt-2 text-xs text-muted">
                  {threatDelta > 0 ? "▲" : "▼"} {Math.abs(threatDelta)} since {previous && fmtShort(previous.capturedAt)}
                </p>
              )}
            </div>
            <div>
              <p className="microlabel mb-2">Opportunity</p>
              <p className="font-display text-5xl text-foreground">
                {opportunity ?? "—"}
                {opportunity != null && <span className="text-lg text-faint"> /100</span>}
              </p>
            </div>
          </div>

          {competitor.similarityScore != null && (
            <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
              <span className="microlabel">Similarity to you</span>
              <span className="font-data text-sm text-foreground">
                {Math.round(competitor.similarityScore * 100)}%
              </span>
            </div>
          )}

          {/* Factor breakdown as ranked hairline bars */}
          {factors.length > 0 && (
            <div className="mt-8">
              <p className="microlabel mb-4">Threat composition</p>
              <ul className="space-y-3">
                {factors.map(([factor, value]) => (
                  <li key={factor}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted">{humanize(factor)}</span>
                      <span className="font-data text-xs text-faint">{value}</span>
                    </div>
                    <div aria-hidden className="mt-1.5 h-px w-full bg-border">
                      <div
                        className="h-px bg-score"
                        style={{ width: `${factorMax ? Math.round((value / factorMax) * 100) : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot && (
            <p className="microlabel mt-6 flex items-center gap-2">
              Assessed {fmtDate(snapshot.capturedAt)}
              <Badge variant="inference">AI inference</Badge>
            </p>
          )}

          {/* Live technology stack */}
          {techByCategory.size > 0 && (
            <div className="mt-10 border-t border-border pt-6">
              <p className="microlabel mb-4">Technology observed</p>
              <dl className="space-y-3">
                {[...techByCategory.entries()].map(([cat, names]) => (
                  <div key={cat} className="flex gap-4">
                    <dt className="w-20 shrink-0 text-xs text-faint">{TECH_LABEL[cat] ?? humanize(cat)}</dt>
                    <dd className="text-xs leading-relaxed text-muted">{names.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>

        {/* Main column — strategic assessment + the development record */}
        <div className="lg:col-span-8">
          {/* Strategic assessment */}
          <section>
            <div className="mb-6 flex items-baseline justify-between border-b border-border pb-3">
              <p className="microlabel">Strategic assessment</p>
              {competitor.insights.length > 0 && (
                <span className="font-data text-xs text-faint">
                  {competitor.insights.length} {competitor.insights.length === 1 ? "insight" : "insights"}
                </span>
              )}
            </div>

            {restInsights.length === 0 && !lead ? (
              <EmptyState
                icon={Lightbulb}
                eyebrow="Analysis in progress"
                title="No strategic insights yet"
                description="As signals accumulate, MarketMind synthesises opportunities, gaps, and SWOT reads for this competitor here."
              />
            ) : (
              <ol className="space-y-8">
                {restInsights.map((insight) => (
                  <li key={insight.id} className="border-b border-border pb-8 last:border-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span className="microlabel text-accent">{INSIGHT_LABEL[insight.type]}</span>
                      <span className="microlabel">{IMPACT_LABEL[insight.impact]}</span>
                      <Badge variant="inference" className="ml-auto">AI inference</Badge>
                    </div>
                    <h3 className="font-sans text-base font-medium text-foreground">{insight.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{insight.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Development record */}
          <section className="mt-16">
            <div className="mb-6 flex items-baseline justify-between border-b border-border pb-3">
              <p className="microlabel">Recent developments</p>
              {latestSignal ? (
                <span className="font-data text-xs text-faint">
                  Updated {fmtShort(latestSignal.detectedAt)}
                </span>
              ) : null}
            </div>

            {competitor.signals.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No developments recorded"
                description={
                  competitor.status === "TRACKING"
                    ? "Monitoring is active — observations will appear here as the market moves, newest first."
                    : "Track this competitor to begin monitoring its public footprint."
                }
              />
            ) : (
              <ol className="border-t border-border">
                {competitor.signals.map((signal) => (
                  <SignalEntry key={signal.id} signal={signal} />
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
