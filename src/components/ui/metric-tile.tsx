import { cn } from "@/lib/utils";

type DeltaDirection = "up" | "down" | "flat";
type DeltaTone = "positive" | "negative" | "neutral";

const ARROW: Record<DeltaDirection, string> = { up: "↑", down: "↓", flat: "→" };
const TONE_CLASS: Record<DeltaTone, string> = {
  positive: "text-accent",
  negative: "text-critical",
  neutral: "text-faint",
};

export interface MetricDelta {
  direction: DeltaDirection;
  label: string;
  /** Colour of the delta. Defaults to positive=up / negative=down. */
  tone?: DeltaTone;
}

/**
 * One metric, one rhythm: microlabel → large tabular figure → optional delta.
 * Used for every headline number (threat, similarity, momentum, opportunity)
 * so spacing and type are identical wherever a figure appears. `value` is a
 * node, so a <CountUp> can be dropped straight in.
 */
export function MetricTile({
  label,
  value,
  delta,
  hint,
  align = "left",
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: MetricDelta;
  hint?: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = delta?.tone ?? (delta?.direction === "down" ? "negative" : delta?.direction === "up" ? "positive" : "neutral");
  const valueSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p className="microlabel text-faint">{label}</p>
      <p className={cn("font-data mt-1 tabular-nums leading-none text-foreground", valueSize)}>{value}</p>
      {delta && (
        <p className={cn("font-data mt-1.5 flex items-center gap-1 text-xs", TONE_CLASS[tone], align === "center" && "justify-center")}>
          <span aria-hidden>{ARROW[delta.direction]}</span>
          {delta.label}
        </p>
      )}
      {hint && !delta && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}
