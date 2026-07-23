import { cn } from "@/lib/utils";

/**
 * A tiny inline momentum chart. Uses `currentColor`, so the caller sets the
 * hue via text color. A flat baseline renders when there's no activity.
 */
export function Sparkline({
  data,
  className,
  strokeWidth = 1.4,
}: {
  data: number[];
  className?: string;
  strokeWidth?: number;
}) {
  const W = 64;
  const H = 20;

  if (!data.length || data.every((v) => v === 0)) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn(className)} aria-hidden>
        <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      </svg>
    );
  }

  const max = Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => [(i / (n - 1)) * W, H - 1 - (v / max) * (H - 2)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn(className)} aria-hidden>
      <path d={area} fill="currentColor" fillOpacity="0.1" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Trend glyph — the caller colors it (↑ heating, ↓ cooling, → steady). */
export function trendGlyph(trend: "up" | "down" | "flat"): string {
  return trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
}
