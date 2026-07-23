import Link from "next/link";
import { SEV, SEV_LABEL, stamp } from "@/components/terminal/terminal";
import type { TopThreatBrief as Brief } from "@/features/dashboard/service";

/**
 * The top-threat brief — the dashboard's answer to "so what do I do about the
 * scariest competitor?" Three movements, all assembled from intelligence we
 * already hold: WHY they rank first (score composition), WHAT they're doing now
 * (newest signal), and HOW to compete (strategic reads). Terminal-themed to sit
 * inside the briefing. Additive — the score tile above still stands alone.
 */
export function TopThreatBrief({ brief }: { brief: Brief }) {
  const { name, threatScore, similarityPct, marketPosition, drivers, latest, plays } = brief;
  const driverMax = drivers.length ? Math.max(...drivers.map((d) => d.value)) : 0;

  return (
    <section
      aria-label="Top threat brief"
      className="border-t border-[var(--t-line)] px-5 py-7 sm:px-7"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-[var(--t-gold)]">
            Top threat · how to respond
          </p>
          <h2 className="font-display mt-1.5 text-2xl leading-tight text-[var(--t-text)]">
            Why {name} is your #1 threat
          </h2>
          <p className="font-data mt-1.5 text-[11px] text-[var(--t-faint)]">
            Threat {threatScore}/100
            {similarityPct != null ? ` · ${similarityPct}% similar to you` : ""}
            {marketPosition ? ` · ${marketPosition}` : ""}
          </p>
        </div>
        <Link
          href={`/competitors/${brief.id}`}
          className="font-data text-[11px] uppercase tracking-wider text-[var(--t-accent)] hover:underline"
        >
          Open full dossier →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--t-line)] bg-[var(--t-line)] md:grid-cols-3">
        {/* WHY it ranks first — the score composition */}
        <div className="bg-[var(--t-bg)] p-5">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
            Why it ranks first
          </p>
          {drivers.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {drivers.map((d) => (
                <li key={d.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[var(--t-muted)]">{d.label}</span>
                    <span className="font-data text-xs font-medium text-[var(--t-text)]">{d.value}</span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--t-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--t-gold)]"
                      style={{ width: `${driverMax ? Math.round((d.value / driverMax) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-[var(--t-muted)]">
              {similarityPct != null
                ? `It serves your market closely (${similarityPct}% similar). A full threat breakdown appears as it's scored.`
                : "A threat breakdown appears once this competitor is scored."}
            </p>
          )}
        </div>

        {/* WHAT they're doing now — the newest signal */}
        <div className="bg-[var(--t-bg)] p-5">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
            What they&apos;re doing now
          </p>
          {latest ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  aria-hidden
                  className="text-[9px]"
                  style={{
                    color: SEV[latest.severity],
                    textShadow: latest.severity === "INFO" ? undefined : `0 0 7px ${SEV[latest.severity]}`,
                  }}
                >
                  ●
                </span>
                <span
                  className="font-data text-[10px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: SEV[latest.severity] }}
                >
                  {SEV_LABEL[latest.severity]}
                </span>
                <span className="font-data text-[10px] text-[var(--t-faint)]">
                  {stamp(latest.detectedAt).split(" · ")[0]}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug text-[var(--t-text)]">{latest.title}</p>
              {latest.whyItMatters && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--t-muted)]">{latest.whyItMatters}</p>
              )}
              {latest.sourceUrl && (
                <a
                  href={latest.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-data mt-3 inline-block text-[11px] text-[var(--t-live)] hover:underline"
                >
                  {latest.sourceName ?? "source"} ↗
                </a>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-[var(--t-muted)]">
              No public movement recorded yet — monitoring is live and lands here first.
            </p>
          )}
        </div>

        {/* HOW to compete — strategic reads (AI) */}
        <div className="bg-[var(--t-bg)] p-5">
          <div className="flex items-center justify-between">
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
              How to compete
            </p>
            <span className="font-data text-[9px] uppercase tracking-widest text-[var(--t-pewter)]">AI</span>
          </div>
          {plays.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {plays.map((p, i) => (
                <li key={i}>
                  <p className="text-sm font-medium leading-snug text-[var(--t-accent)]">
                    <span className="opacity-70">→ </span>
                    {p.title}
                  </p>
                  {p.body && (
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[var(--t-muted)]">{p.body}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : latest?.recommendation ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--t-accent)]">
              <span className="opacity-70">→ </span>
              {latest.recommendation}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-[var(--t-muted)]">
              A play book synthesises as signals accumulate. Track more of this competitor&apos;s
              footprint to sharpen the recommendation.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
