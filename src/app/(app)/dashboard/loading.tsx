import type { CSSProperties } from "react";

const TERMINAL: CSSProperties = {
  "--t-bg": "#131209",
  "--t-line": "#302d20",
  "--t-accent": "#9cbb84",
  "--t-faint": "#6f6b59",
} as CSSProperties;

/** Terminal-styled loading so the dashboard never flashes light then dark. */
export default function Loading() {
  return (
    <div
      style={TERMINAL}
      className="relative overflow-hidden rounded-3xl border border-[var(--t-line)] bg-[var(--t-bg)] shadow-[0_40px_90px_-50px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-center gap-3 border-b border-[var(--t-line)] px-5 py-4 sm:px-7">
        <span className="size-2 animate-ping rounded-full bg-[var(--t-accent)]" />
        <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-accent)]">
          Live
        </span>
        <span className="font-data text-[11px] uppercase tracking-[0.28em] text-[var(--t-faint)]">
          Compiling the briefing…
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-[var(--t-line)] sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[var(--t-bg)] px-5 py-6 sm:px-7">
            <div className="shimmer h-3 w-24 rounded bg-white/5" />
            <div className="shimmer mt-4 h-10 w-16 rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div className="space-y-3 px-5 py-6 sm:px-7">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-16 rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
