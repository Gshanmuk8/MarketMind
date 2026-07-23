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
  "--t-faint": "#8f8a75",
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

export const SEV_LABEL: Record<SignalSeverity, string> = {
  CRITICAL: "Critical",
  IMPORTANT: "Important",
  NOTABLE: "Notable",
  INFO: "Info",
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

/** The dark panel wrapper — layered material, dual accent bloom, a top light
 *  along the bevel, and the fade-up. Built to feel like a machined instrument
 *  under gallery lighting rather than a dark rectangle. */
export function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...TERMINAL,
        // Deep drop for float + a hairline top light where the edge catches
        // the light + a faint inner floor shadow for physical depth.
        boxShadow:
          "0 44px 100px -50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -60px 80px -60px rgba(0,0,0,0.6)",
      }}
      className="rise relative overflow-hidden rounded-3xl border border-[var(--t-line)] bg-[var(--t-bg)] text-[var(--t-text)]"
    >
      {/* Fine machined grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Sage bloom, upper-left — the live/positive light source */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{ background: "radial-gradient(58% 100% at 14% 0%, rgba(156,187,132,0.12), transparent 72%)" }}
      />
      {/* Faint gold counter-bloom, lower-right — depth + warmth balance */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-56 w-2/3"
        style={{ background: "radial-gradient(70% 100% at 100% 100%, rgba(208,183,104,0.06), transparent 68%)" }}
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
  // Urgency must be legible at a glance, not decoded from a 9px dot: the two
  // urgent tiers earn a coloured left rail, a tinted ground (CRITICAL), and a
  // spelled-out label so triage is instant.
  const urgent = signal.severity === "CRITICAL" || signal.severity === "IMPORTANT";
  return (
    <li
      className="border-t border-[var(--t-line)] px-5 py-4 transition-colors hover:bg-white/[0.025] sm:px-7"
      style={{
        borderLeft: `2px solid ${urgent ? SEV[signal.severity] : "transparent"}`,
        backgroundColor:
          signal.severity === "CRITICAL"
            ? "color-mix(in oklab, var(--t-critical), transparent 93%)"
            : undefined,
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-data text-[11px] tracking-wide text-[var(--t-faint)]">
          {stamp(signal.detectedAt)}
        </span>
        <span
          aria-hidden
          className="text-[9px]"
          style={{
            color: SEV[signal.severity],
            // Glow only reads on important marks; on INFO/faint it's a smudge.
            textShadow: signal.severity === "INFO" ? undefined : `0 0 7px ${SEV[signal.severity]}`,
          }}
        >
          ●
        </span>
        {urgent && (
          <span
            className="font-data text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: SEV[signal.severity] }}
          >
            {SEV_LABEL[signal.severity]}
          </span>
        )}
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
