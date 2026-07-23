import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TerminalShell, TerminalHeader, TerminalSignalRow, stamp } from "@/components/terminal/terminal";
import { getSessionUser } from "@/lib/session";
import { getCompetitor } from "@/features/competitors/service";
import { ActivityTimeline } from "@/features/competitor-timeline/components/activity-timeline";
import type { InsightType, ImpactLevel } from "@prisma/client";

export const metadata: Metadata = { title: "Competitor dossier" };

/* ── presentational helpers ──────────────────────────────────────────── */

function humanize(key: string) {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
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

/** Full competitor dossier — a dark Intelligence File (command surface). */
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

  const techByCategory = new Map<string, string[]>();
  for (const t of competitor.techEntries) {
    const list = techByCategory.get(t.category) ?? [];
    list.push(t.name);
    techByCategory.set(t.category, list);
  }

  const facts = [
    competitor.marketPosition && { label: "Position", value: competitor.marketPosition },
    competitor.fundingStage && { label: "Funding", value: competitor.fundingStage },
    competitor.employeeRange && { label: "Headcount", value: competitor.employeeRange },
    competitor.pricingSummary && { label: "Pricing", value: competitor.pricingSummary },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <TerminalShell>
      <TerminalHeader label={`Dossier · ${competitor.domain}`} subtitle={competitor.name} />

      {/* Status + description band */}
      <div className="border-b border-[var(--t-line)] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="font-data text-[10px] uppercase tracking-[0.18em]"
            style={{ color: competitor.status === "TRACKING" ? "var(--t-accent)" : "var(--t-faint)" }}
          >
            {competitor.status === "TRACKING" ? "● Tracking" : competitor.status.toLowerCase()}
          </span>
          {competitor.similarityScore != null && (
            <span className="font-data text-[10px] uppercase tracking-[0.18em] text-[var(--t-muted)]">
              {Math.round(competitor.similarityScore * 100)}% similar to you
            </span>
          )}
        </div>
        {competitor.description && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--t-muted)]">
            {competitor.description}
          </p>
        )}
      </div>

      {/* Metric strip — only the metrics we actually have (no empty cells) */}
      <section className="flex flex-wrap border-b border-[var(--t-line)]">
        <div className="min-w-[150px] flex-1 px-5 py-6 sm:px-7">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">Threat</p>
          <p
            className="font-data mt-2 text-4xl font-medium tabular-nums text-[var(--t-gold)]"
            style={{ textShadow: "0 0 22px rgba(208,183,104,0.28)" }}
          >
            {threat ?? "—"}
          </p>
          {threatDelta != null && threatDelta !== 0 && (
            <p className="font-data mt-1 text-[11px] text-[var(--t-muted)]">
              {threatDelta > 0 ? "▲" : "▼"} {Math.abs(threatDelta)}
              {previous ? ` since ${stamp(previous.capturedAt).split(" · ")[0]}` : ""}
            </p>
          )}
        </div>
        {opportunity != null && (
          <div className="min-w-[150px] flex-1 border-l border-[var(--t-line)] px-5 py-6 sm:px-7">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              Opportunity
            </p>
            <p className="font-data mt-2 text-4xl font-medium tabular-nums text-[var(--t-accent)]">
              {opportunity}
            </p>
          </div>
        )}
        {facts.map((f) => (
          <div
            key={f.label}
            className="min-w-[150px] flex-1 border-l border-[var(--t-line)] px-5 py-6 sm:px-7"
          >
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              {f.label}
            </p>
            <p className="mt-2 text-sm text-[var(--t-text)]">{f.value}</p>
          </div>
        ))}
      </section>

      {/* Lead assessment standfirst */}
      {lead && (
        <section className="border-t border-[var(--t-line)] px-5 py-8 sm:px-7">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="font-data text-[10px] uppercase tracking-[0.18em] text-[var(--t-accent)]">
              {INSIGHT_LABEL[lead.type]}
            </span>
            <span className="font-data text-[10px] uppercase tracking-widest text-[var(--t-pewter)]">
              AI assessment
            </span>
          </div>
          <p className="font-display max-w-3xl text-2xl leading-snug text-[var(--t-text)] sm:text-3xl">
            {lead.title}
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--t-muted)]">{lead.body}</p>
        </section>
      )}

      {/* Activity timeline (inherits --t-* from the shell) */}
      <div className="border-t border-[var(--t-line)] px-5 py-6 sm:px-7">
        <ActivityTimeline competitorId={id} />
      </div>

      {/* Strategic assessment + development record */}
      <div className="grid grid-cols-1 gap-px border-t border-[var(--t-line)] bg-[var(--t-line)] lg:grid-cols-2">
        <section className="bg-[var(--t-bg)] px-5 py-7 sm:px-7">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[var(--t-muted)]">
              Strategic assessment
            </p>
            {competitor.insights.length > 0 && (
              <span className="font-data text-[11px] text-[var(--t-faint)]">
                {competitor.insights.length} {competitor.insights.length === 1 ? "insight" : "insights"}
              </span>
            )}
          </div>
          {restInsights.length === 0 && !lead ? (
            <p className="text-sm leading-relaxed text-[var(--t-muted)]">
              No strategic insights yet. As signals accumulate, MarketMind synthesises opportunities,
              gaps, and SWOT reads for this competitor here.
            </p>
          ) : (
            <ol className="space-y-5">
              {restInsights.map((insight) => (
                <li
                  key={insight.id}
                  className="rounded-xl border border-[var(--t-line)] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="font-data text-[10px] uppercase tracking-[0.15em] text-[var(--t-accent)]">
                      {INSIGHT_LABEL[insight.type]}
                    </span>
                    <span className="font-data text-[10px] uppercase tracking-[0.15em] text-[var(--t-faint)]">
                      {IMPACT_LABEL[insight.impact]}
                    </span>
                    <span className="ml-auto font-data text-[10px] uppercase tracking-widest text-[var(--t-pewter)]">
                      AI
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[var(--t-text)]">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--t-muted)]">{insight.body}</p>
                </li>
              ))}
            </ol>
          )}

          {/* Tech observed */}
          {techByCategory.size > 0 && (
            <div className="mt-8 border-t border-[var(--t-line)] pt-6">
              <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
                Technology observed
              </p>
              <dl className="space-y-3">
                {[...techByCategory.entries()].map(([cat, names]) => (
                  <div key={cat} className="flex gap-4">
                    <dt className="font-data w-20 shrink-0 text-[11px] uppercase tracking-wider text-[var(--t-faint)]">
                      {TECH_LABEL[cat] ?? humanize(cat)}
                    </dt>
                    <dd className="text-xs leading-relaxed text-[var(--t-muted)]">{names.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Threat composition */}
          {factors.length > 0 && (
            <div className="mt-8 border-t border-[var(--t-line)] pt-6">
              <p className="font-data mb-4 text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
                Threat composition
              </p>
              <ul className="space-y-3">
                {factors.map(([factor, value]) => (
                  <li key={factor}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[var(--t-muted)]">{humanize(factor)}</span>
                      <span className="font-data text-xs text-[var(--t-faint)]">{value}</span>
                    </div>
                    <div aria-hidden className="mt-1.5 h-px w-full bg-[var(--t-line)]">
                      <div
                        className="h-px bg-[var(--t-gold)]"
                        style={{
                          width: `${factorMax ? Math.round((value / factorMax) * 100) : 0}%`,
                          boxShadow: "0 0 6px var(--t-gold)",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Development record */}
        <section className="bg-[var(--t-bg)]">
          <div className="flex items-center justify-between px-5 py-4 sm:px-7">
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[var(--t-muted)]">
              Recent developments
            </p>
            {competitor.signals[0] && (
              <span className="font-data text-[11px] text-[var(--t-faint)]">
                {stamp(competitor.signals[0].detectedAt).split(" · ")[0]}
              </span>
            )}
          </div>
          {competitor.signals.length === 0 ? (
            <p className="border-t border-[var(--t-line)] px-5 py-8 text-sm leading-relaxed text-[var(--t-muted)] sm:px-7">
              {competitor.status === "TRACKING"
                ? "Monitoring is active — observations will appear here as the market moves, newest first."
                : "Track this competitor to begin monitoring its public footprint."}
            </p>
          ) : (
            <ol>
              {competitor.signals.map((signal) => (
                <TerminalSignalRow key={signal.id} signal={signal} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </TerminalShell>
  );
}
