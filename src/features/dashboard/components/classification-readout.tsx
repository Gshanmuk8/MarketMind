import Link from "next/link";

/**
 * Trust layer for the AI's read of the site. Rather than a bare label, we show
 * *why* it classified the way it did (evidence chips) and *how sure* it is (a
 * confidence meter). For non-competitive sites this doubles as the explanation
 * for why competitor intelligence is switched off. Terminal-themed to match
 * the dashboard it sits in.
 */
export function ClassificationReadout({
  label,
  reason,
  confidence,
  signals,
  competitive,
}: {
  label: string;
  reason: string;
  confidence: number | null;
  signals: string[];
  competitive: boolean;
}) {
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const filled = confidence != null ? Math.round(confidence * 10) : 0;
  const tier =
    confidence == null
      ? null
      : confidence >= 0.8
        ? { text: "High confidence", color: "var(--t-accent)" }
        : confidence >= 0.5
          ? { text: "Moderate confidence", color: "var(--t-gold)" }
          : { text: "Low confidence", color: "var(--t-pewter)" };

  return (
    <div className="border-b border-[var(--t-line)] bg-white/[0.02] px-5 py-4 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-pewter)]">
          We read your site as · {label}
        </p>
        {pct != null && tier && (
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-px" aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="h-2.5 w-1 rounded-[1px] transition-colors"
                  style={{ background: i < filled ? tier.color : "var(--t-line)" }}
                />
              ))}
            </span>
            <span
              className="font-data text-[10px] uppercase tracking-[0.15em]"
              style={{ color: tier.color }}
            >
              {pct}% · {tier.text}
            </span>
          </div>
        )}
      </div>

      {competitive
        ? reason && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--t-muted)]">{reason}</p>
          )
        : (
          <>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--t-text)]">
              This site reads as a {label.toLowerCase()}, not a company — so competitive intelligence
              (competitors, threats, strategy) doesn&apos;t apply here.
              {reason ? ` ${reason}` : ""}
            </p>
            <p className="mt-1.5 text-sm text-[var(--t-muted)]">
              If this is actually a company, change the website in{" "}
              <Link href="/settings" className="text-[var(--t-accent)] hover:underline">
                Settings
              </Link>{" "}
              and re-run analysis.
            </p>
          </>
        )}

      {signals.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {signals.map((s, i) => (
            <li
              key={i}
              className="font-data flex items-center gap-1 rounded-full border border-[var(--t-line)] px-2 py-0.5 text-[11px] text-[var(--t-muted)]"
            >
              <span className="text-[var(--t-accent)]" aria-hidden>
                ✓
              </span>{" "}
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
