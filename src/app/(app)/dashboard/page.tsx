import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { TerminalShell, TerminalHeader, LiveDot, TerminalSignalRow } from "@/components/terminal/terminal";
import { getSessionUser } from "@/lib/session";
import { getBriefing } from "@/features/dashboard/service";
import { countSignalsSince } from "@/features/signals/service";
import { RetryAnalysis } from "@/features/dashboard/components/retry-analysis";
import { MarkSeen } from "@/features/dashboard/components/mark-seen";
import { LAST_SEEN_COOKIE } from "@/features/dashboard/constants";

export const metadata: Metadata = { title: "Dashboard" };

// The briefing must reflect the market as of this request, never a cached page.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const briefing = await getBriefing(user.id);

  if (!briefing.company) {
    return (
      <TerminalShell>
        <TerminalHeader label="The Briefing" subtitle="awaiting first company" />
        <div className="px-6 py-20 text-center sm:py-28">
          <p className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-faint)]">
            First edition pending
          </p>
          <h1 className="font-display mt-5 text-3xl text-[var(--t-text)] sm:text-4xl">
            Your market, read for you
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--t-muted)]">
            Enter your website URL and MarketMind AI maps your market, discovers competitors, and
            begins monitoring — automatically.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--t-accent)]/40 bg-[var(--t-accent)]/10 px-6 text-sm font-medium text-[var(--t-accent)] transition-colors hover:bg-[var(--t-accent)]/20"
          >
            ▸ Start analysis
          </Link>
        </div>
      </TerminalShell>
    );
  }

  const { company, signalsLastDay, trackedCount, suggestedCount, topThreat, signals } = briefing;
  const analyzing = company.analysisStatus === "PENDING" || company.analysisStatus === "ANALYZING";

  // "New since your last visit" — from the per-device cookie MarkSeen stamps.
  const lastSeenRaw = (await cookies()).get(LAST_SEEN_COOKIE)?.value;
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;
  const newSinceLastVisit =
    lastSeen && !Number.isNaN(lastSeen.getTime())
      ? await countSignalsSince(user.id, lastSeen)
      : 0;

  return (
    <>
      <LiveRefresh />
      <MarkSeen />
      <TerminalShell>
        <TerminalHeader label="The Briefing" subtitle={company.name ?? company.domain} />

        {analyzing && (
          <div className="flex items-center gap-3 border-b border-[var(--t-line)] bg-[var(--t-accent)]/[0.04] px-5 py-4 sm:px-7">
            <LiveDot />
            <p className="text-sm text-[var(--t-text)]">
              Compiling your dossier —{" "}
              <span className="text-[var(--t-muted)]">
                reading your site, discovering competitors (~1–3 min). This page updates itself.
              </span>
            </p>
          </div>
        )}
        {company.analysisStatus === "FAILED" && (
          <div className="border-b border-[var(--t-line)] px-5 py-4 text-sm text-[var(--t-critical)] sm:px-7">
            Analysis could not complete. <RetryAnalysis companyId={company.id} />
          </div>
        )}

        {/* Stat tiles */}
        <section aria-label="Key figures" className="grid grid-cols-1 gap-px bg-[var(--t-line)] sm:grid-cols-3">
          <div className="bg-[var(--t-bg)] px-5 py-6 sm:px-7">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              Signals · 24h
            </p>
            <p
              className="font-data mt-3 text-5xl font-medium tabular-nums"
              style={{ textShadow: "0 0 24px rgba(156,187,132,0.22)" }}
            >
              {signalsLastDay}
            </p>
          </div>
          <div className="bg-[var(--t-bg)] px-5 py-6 sm:px-7">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              Competitors tracked
            </p>
            <p className="font-data mt-3 text-5xl font-medium tabular-nums">{trackedCount}</p>
            {suggestedCount > 0 && (
              <Link
                href="/competitors"
                className="font-data mt-2 inline-block text-[11px] text-[var(--t-accent)] hover:underline"
              >
                {suggestedCount} suggested — review →
              </Link>
            )}
          </div>
          <div className="bg-[var(--t-bg)] px-5 py-6 sm:px-7">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              Highest threat
            </p>
            {topThreat ? (
              <>
                <p
                  className="font-data mt-3 text-5xl font-medium tabular-nums text-[var(--t-gold)]"
                  style={{ textShadow: "0 0 24px rgba(208,183,104,0.28)" }}
                >
                  {topThreat.threatScore}
                </p>
                <Link
                  href={`/competitors/${topThreat.id}`}
                  className="font-data mt-2 inline-block text-[11px] text-[var(--t-muted)] hover:text-[var(--t-text)] hover:underline"
                >
                  {topThreat.name} →
                </Link>
              </>
            ) : (
              <p className="mt-5 text-sm text-[var(--t-faint)]">Awaiting first assessment</p>
            )}
          </div>
        </section>

        {/* Feed */}
        <section aria-label="Latest intelligence">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--t-line)] px-5 py-3.5 sm:px-7">
            <div className="flex items-center gap-3">
              <h2 className="font-data text-[11px] uppercase tracking-[0.22em] text-[var(--t-muted)]">
                Latest intelligence
              </h2>
              {newSinceLastVisit > 0 && (
                <span
                  className="font-data text-[10px] uppercase tracking-wider text-[var(--t-accent)]"
                  style={{ textShadow: "0 0 8px rgba(156,187,132,0.4)" }}
                >
                  +{newSinceLastVisit} new since last visit
                </span>
              )}
            </div>
            <span className="font-data text-[10px] uppercase tracking-wider text-[var(--t-pewter)]">
              inferences labeled
            </span>
          </div>

          {signals.length === 0 ? (
            <div className="border-t border-[var(--t-line)] px-6 py-16 text-center">
              <p className="font-data text-[11px] uppercase tracking-[0.24em] text-[var(--t-faint)]">
                Monitoring
              </p>
              <h3 className="font-display mt-3 text-2xl text-[var(--t-text)]">No signals yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--t-muted)]">
                {trackedCount > 0
                  ? "Monitoring is active. Observations land here as your market moves — each with why it matters and what to do."
                  : "Track competitors from the landscape page and monitoring begins automatically."}
              </p>
              {trackedCount === 0 && (
                <Link
                  href="/competitors"
                  className="font-data mt-6 inline-block text-sm text-[var(--t-accent)] hover:underline"
                >
                  Review suggested competitors →
                </Link>
              )}
            </div>
          ) : (
            <ol>
              {signals.map((signal) => (
                <TerminalSignalRow key={signal.id} signal={signal} />
              ))}
            </ol>
          )}
        </section>
      </TerminalShell>
    </>
  );
}
