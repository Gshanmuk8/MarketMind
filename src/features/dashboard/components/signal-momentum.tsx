"use client";

import { useRef, useState } from "react";
import type { MomentumDay } from "@/features/dashboard/service";

/**
 * Signal Momentum — the dashboard's signature visualization. A glowing area
 * chart of severity-weighted signal intensity over the last 30 days, with
 * spike markers, a trend read, and hover explanations. Bespoke SVG (not a
 * chart lib) so it matches the Intelligence Terminal exactly. Inherits the
 * `--t-*` palette from the shell.
 */
export function SignalMomentum({ data }: { data: MomentumDay[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);

  const total = data.reduce((n, d) => n + d.weight, 0);
  if (data.length < 2 || total === 0) {
    return (
      <div className="border-t border-[var(--t-line)] px-5 py-8 sm:px-7">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
          Signal momentum
        </p>
        <p className="mt-3 text-sm text-[var(--t-muted)]">
          Momentum builds here as signals accumulate — the last 30 days are quiet so far.
        </p>
      </div>
    );
  }

  const W = 820;
  const H = 150;
  const padX = 14;
  const padTop = 18;
  const padBottom = 22;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.weight));

  const xAt = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const yAt = (w: number) => H - padBottom - (w / max) * (H - padTop - padBottom);

  const pts = data.map((d, i) => [xAt(i), yAt(d.weight)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(1)} ${H - padBottom} L${xAt(0).toFixed(1)} ${H - padBottom} Z`;

  // Trend: last 7 days vs the 7 before.
  const sum = (from: number, to: number) => data.slice(from, to).reduce((s, d) => s + d.weight, 0);
  const recent = sum(n - 7, n);
  const prior = sum(n - 14, n - 7);
  const trendUp = recent >= prior;
  const trendPct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : recent > 0 ? 100 : 0;

  // Biggest recent spike (prefer an IMPORTANT/CRITICAL day) for the callout.
  let spikeIdx = -1;
  let spikeMax = 0;
  data.forEach((d, i) => {
    if (d.weight > spikeMax) {
      spikeMax = d.weight;
      spikeIdx = i;
    }
  });
  const spike = spikeIdx >= 0 ? data[spikeIdx] : null;

  // A few x-axis date ticks.
  const tickIdx = [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1];

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const i = Math.min(n - 1, Math.max(0, Math.round(px * (n - 1))));
    setHi(i);
  }

  const active = hi != null ? data[hi] : null;
  const activeLeftPct = hi != null ? (xAt(hi) / W) * 100 : 0;

  return (
    <div className="border-t border-[var(--t-line)] px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[var(--t-faint)]">
          Signal momentum
        </p>
        <span className="font-data text-[10px] uppercase tracking-wider text-[var(--t-muted)]">· 30 days</span>
        <span
          className="font-data ml-auto text-[11px]"
          style={{ color: trendUp ? "var(--t-accent)" : "var(--t-muted)" }}
        >
          {trendUp ? "▲" : "▼"} {Math.abs(trendPct)}% vs prior week
        </span>
      </div>

      {spike?.reason && (
        <p className="mt-1.5 text-xs text-[var(--t-muted)]">
          <span className="text-[var(--t-gold)]" style={{ textShadow: "0 0 8px rgba(208,183,104,0.4)" }}>
            ● Peak {spike.label}
          </span>{" "}
          — {spike.reason}
        </p>
      )}

      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[150px] w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHi(null)}
        >
          <defs>
            <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--t-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--t-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline */}
          <line x1={padX} y1={H - padBottom} x2={W - padX} y2={H - padBottom} stroke="var(--t-line)" strokeWidth="1" />

          <path d={area} fill="url(#momentumFill)" />
          <path
            d={line}
            fill="none"
            stroke="var(--t-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(156,187,132,0.5))" }}
          />

          {/* spike / important-day markers */}
          {data.map((d, i) =>
            d.peak && d.weight > 0 ? (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(d.weight)}
                r="3.5"
                fill="var(--t-gold)"
                style={{ filter: "drop-shadow(0 0 5px rgba(208,183,104,0.7))" }}
              />
            ) : null
          )}

          {/* hover guide */}
          {hi != null && (
            <g>
              <line
                x1={xAt(hi)}
                y1={padTop - 6}
                x2={xAt(hi)}
                y2={H - padBottom}
                stroke="var(--t-muted)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <circle cx={xAt(hi)} cy={yAt(data[hi]?.weight ?? 0)} r="4" fill="var(--t-text)" />
            </g>
          )}
        </svg>

        {/* hover tooltip */}
        {active && (
          <div
            className="pointer-events-none absolute -top-1 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--t-line)] bg-[var(--t-panel)] px-3 py-2 text-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
            style={{ left: `${activeLeftPct}%` }}
          >
            <p className="font-data text-[11px] text-[var(--t-faint)]">{active.label}</p>
            <p className="mt-0.5 text-[var(--t-text)]">
              {active.count} {active.count === 1 ? "signal" : "signals"}
            </p>
            {active.reason && (
              <p className="mt-1 max-w-[220px] text-[var(--t-muted)]">{active.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* x ticks */}
      <div className="mt-1 flex justify-between px-[14px]">
        {tickIdx.map((i) => (
          <span key={i} className="font-data text-[10px] text-[var(--t-faint)]">
            {data[i]?.label}
          </span>
        ))}
      </div>
    </div>
  );
}
