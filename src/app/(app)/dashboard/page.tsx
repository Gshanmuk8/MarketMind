import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Signal, SignalSeverity } from "@prisma/client";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { getSessionUser } from "@/lib/session";
import { getBriefing } from "@/features/dashboard/service";
import { countSignalsSince } from "@/features/signals/service";
import { RetryAnalysis } from "@/features/dashboard/components/retry-analysis";
import { MarkSeen } from "@/features/dashboard/components/mark-seen";
import { TerminalClock } from "@/features/dashboard/components/terminal-clock";
import { LAST_SEEN_COOKIE } from "@/features/dashboard/constants";

export const metadata: Metadata = { title: "Dashboard" };

// The briefing must reflect the market as of this request, never a cached page.
export const dynamic = "force-dynamic";

/* ── Intelligence Terminal theme (self-contained; brand accents on ink) ── */
const TERMINAL: CSSProperties = {
  "--t-bg": "#131209",
  "--t-panel": "#1b1a11",
  "--t-line": "#302d20",
  "--t-text": "#eae6d8",
  "--t-muted": "#a29d8b",
  "--t-faint": "#6f6b59",
  "--t-accent": "#9cbb84", // sage, brightened for ink
  "--t-live": "#79aabd", // mineral
  "--t-gold": "#d0b768", // score
  "--t-critical": "#dd6f66", // brick
  "--t-pewter": "#a6abb4", // AI inference
} as CSSProperties;

const SEV: Record<SignalSeverity, string> = {
  CRITICAL: "var(--t-critical)",
  IMPORTANT: "var(--t-gold)",
  NOTABLE: "var(--t-accent)",
  INFO: "var(--t-faint)",
};

const stamp = (d: Date) =>
  `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()} · ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;

function LiveDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--t-accent)] opacity-60" />
      <span
        className="relative inline-flex size-2 rounded-full bg-[var(--t-accent)]"
        style={{ boxShadow: "0 0 8px var(--t-accent)" }}
      />
    </span>
  );
}

function TerminalHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--t-line)] px-5 py-4 sm:px-7">
      <LiveDot />
      <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-accent)]">Live</span>
      <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-muted)]">
        The Briefing
      </span>
      <span aria-hidden className="text-[var(--t-faint)]">
        /
      </span>
      <span className="truncate text-sm text-[var(--t-text)]">{subtitle}</span>
      <span className="ml-auto text-[var(--t-faint)]">
        <TerminalClock />
      </span>
    </div>
  );
}

function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={TERMINAL}
      className="rise relative overflow-hidden rounded-3xl border border-[var(--t-line)] bg-[var(--t-bg)] text-[var(--t-text)] shadow-[0_40px_90px_-50px_rgba(0,0,0,0.7)]"
    >
      {/* whisper of scanline / dot-grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* top accent bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "radial-gradient(60% 100% at 15% 0%, rgba(156,187,132,0.10), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal & { competitor?: { name: string | null } | null } }) {
  return (
    <li className="border-t border-[var(--t-line)] px-5 py-4 transition-colors hover:bg-white/[0.025] sm:px-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-data text-[11px] tracking-wide text-[var(--t-faint)]">
          {stamp(signal.detectedAt)}
        </span>
        <span
          aria-hidden
          className="text-[9px]"
          style={{ color: SEV[signal.severity], textShadow: `0 0 8px ${SEV[signal.severity]}` }}
        >
          ●
        </span>
        <span className="font-data text-[10px] uppercase tracking-[0.15em] text-[var(--t-muted)]">
          {signal.category.toLowerCase().replace(/_/g, " ")}
        </span>
        {signal.competitor?.name && (
          <span className="text-xs text-[var(--t-live)]">{signal.competitor.name}</span>
        )}
        {signal.isInference && (
          <span className="ml-auto font-data text-[10px] uppercase tracking-widest text-[var(--t-pewter)]">
            AI{signal.confidence != null ? ` ${Math.round(signal.confidence * 100)}%` : ""}
          </span>
        )}
      </div>

      <h3 className="mt-2 text-sm font-medium leading-snug text-[var(--t-text)]">{signal.title}</h3>
      {signal.whyItMatters && (
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--t-muted)]">
          <span className="text-[var(--t-faint)]">▸ </span>
          {signal.whyItMatters}
        </p>
      )}
      {signal.recommendation && (
        <p className="mt-1 text-sm leading-relaxed text-[var(--t-accent)]">
          <span className="opacity-70">→ </span>
          {signal.recommendation}
        </p>
      )}
      {signal.sourceUrl && (
        <a
          href={signal.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-data mt-2 inline-block text-[11px] text-[var(--t-live)] hover:underline"
        >
          {signal.sourceName ?? "source"} ↗
        </a>
      )}
    </li>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const briefing = await getBriefing(user.id);

  if (!briefing.company) {
    return (
      <TerminalShell>
        <TerminalHeader subtitle="awaiting first company" />
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
        <TerminalHeader subtitle={company.name ?? company.domain} />

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
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </ol>
          )}
        </section>
      </TerminalShell>
    </>
  );
}
