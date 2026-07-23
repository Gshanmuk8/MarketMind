import type { CSSProperties } from "react";
import type { Signal, SignalSeverity } from "@prisma/client";
import { TerminalClock } from "@/features/dashboard/components/terminal-clock";

/**
 * Intelligence Terminal — the shared dark "command surface" treatment used
 * by the live/data screens (dashboard briefing, competitor dossier). The
 * reading surfaces (landing, auth, settings, decisions, reports) stay on the
 * light Vellum base. Both share the same accent marks — one brand, two rooms.
 *
 * The `--t-*` custom properties are set on the shell and cascade to every
 * child, so nested components (e.g. the Activity Timeline) can theme
 * themselves with `var(--t-accent)` etc. without prop-drilling.
 */
export const TERMINAL: CSSProperties = {
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

export const SEV: Record<SignalSeverity, string> = {
  CRITICAL: "var(--t-critical)",
  IMPORTANT: "var(--t-gold)",
  NOTABLE: "var(--t-accent)",
  INFO: "var(--t-faint)",
};

export const stamp = (d: Date) =>
  `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()} · ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;

export function LiveDot() {
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

/** The dark panel wrapper — texture, accent bloom, and the fade-up. */
export function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={TERMINAL}
      className="rise relative overflow-hidden rounded-3xl border border-[var(--t-line)] bg-[var(--t-bg)] text-[var(--t-text)] shadow-[0_40px_90px_-50px_rgba(0,0,0,0.7)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: "radial-gradient(60% 100% at 15% 0%, rgba(156,187,132,0.10), transparent 70%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** LIVE · label · subtitle · clock — the command-center header bar. */
export function TerminalHeader({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--t-line)] px-5 py-4 sm:px-7">
      <LiveDot />
      <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-accent)]">Live</span>
      <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-muted)]">{label}</span>
      <span aria-hidden className="text-[var(--t-faint)]">/</span>
      <span className="truncate text-sm text-[var(--t-text)]">{subtitle}</span>
      <span className="ml-auto text-[var(--t-faint)]">
        <TerminalClock />
      </span>
    </div>
  );
}

/** A single signal, typeset as a terminal feed row (why ▸, action →, source). */
export function TerminalSignalRow({
  signal,
}: {
  signal: Signal & { competitor?: { name: string | null } | null };
}) {
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
