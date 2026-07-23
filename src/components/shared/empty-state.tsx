import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

/**
 * An empty screen is not missing data — it is a plate awaiting its subject.
 * We set it like a colophon: concentric radar rings (the market, quietly
 * watched), a soft mineral glow, a serif line, and one clear next action.
 * Never a blank div.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  eyebrow = "Nothing recorded yet",
  action,
}: EmptyStateProps) {
  return (
    <div className="rise flex min-h-[320px] flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[420px] sm:px-6 sm:py-24">
      {/* Radar-ring flourish over a soft mineral bloom — the brand mark as a
          quiet, waiting instrument. */}
      <div aria-hidden className="relative mb-9 flex size-16 items-center justify-center">
        <span
          className="absolute size-56 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-accent), transparent 88%), transparent 62%)",
          }}
        />
        <span className="absolute size-28 rounded-full border border-border/60" />
        <span className="absolute size-40 rounded-full border border-border/30" />
        <span className="absolute size-52 rounded-full border border-border/15" />
        <span className="relative flex size-16 items-center justify-center rounded-full border border-border bg-surface shadow-[var(--shadow-card)]">
          <Icon className="size-6 text-accent/75" strokeWidth={1.5} />
        </span>
      </div>
      <p className="microlabel mb-4">{eyebrow}</p>
      <h3 className="display-3 text-foreground">{title}</h3>
      <p className="measure mt-3.5 text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-9">{action}</div>}
      <span aria-hidden className="rule-soft mt-11 block w-24" />
    </div>
  );
}
