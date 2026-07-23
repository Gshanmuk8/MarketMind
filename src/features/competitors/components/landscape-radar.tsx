"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Sparkline, trendGlyph } from "@/components/ui/sparkline";
import { MetricTile } from "@/components/ui/metric-tile";
import { cn } from "@/lib/utils";
import {
  useCompetitors,
  useUpdateCompetitorStatus,
  type CompetitorRow,
  type CompetitorSpark,
} from "../hooks/use-competitors";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const LABEL_H = 14; // px, one line of the 10px label
const PAD = 3; // collision breathing room

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
// 10px label, ~5.4px/char; capped so one long name can't reserve the whole row.
const labelWidth = (name: string) => Math.min(name.length, 22) * 5.4 + 6;

interface PlacedNode {
  c: CompetitorRow;
  threat: number;
  leftPct: number;
  topPct: number;
  size: number;
  r: number;
  cx: number;
  cy: number;
}

/**
 * Landscape Radar — the competitive market read as a map, not a list. Each
 * competitor is a node positioned by similarity (x) × threat (y), sized by
 * threat. The signature screen of the product, so it earns real craft:
 *
 *  · Labels are collision-aware — overlapping names are nudged and tethered
 *    with a hairline leader, or hidden until focus, so the map never turns to
 *    mush.
 *  · Click a node to enter focus mode: the rest of the field recedes and the
 *    dossier card holds open (works on touch, where there is no hover).
 *  · Light Vellum — the analysis surface — while the dossier itself is dark.
 */
export function LandscapeRadar() {
  const { data } = useCompetitors();
  const update = useUpdateCompetitorStatus();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const competitors = useMemo(() => data?.competitors ?? [], [data?.competitors]);
  const momentum = data?.momentum ?? {};
  const active = selected ?? hovered;

  // Measure the board so label collision runs in real pixels (the aspect
  // ratio changes across breakpoints, so a fixed guess would drift).
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo<PlacedNode[]>(() => {
    return competitors.map((c) => {
      const x = clamp01(c.similarityScore ?? 0.5);
      const y = clamp01((c.threatScore ?? 0) / 100);
      const leftPct = 8 + x * 84; // padded off the edges
      const topPct = 10 + (1 - y) * 80; // inverted — high threat sits high
      const sz = 18 + Math.round(y * 30); // 18–48px
      return {
        c,
        threat: c.threatScore ?? 0,
        leftPct,
        topPct,
        size: sz,
        r: sz / 2,
        cx: (leftPct / 100) * size.w,
        cy: (topPct / 100) * size.h,
      };
    });
  }, [competitors, size.w, size.h]);

  // Greedy label placement. Highest-threat (and the active node) claim their
  // spot first; later labels nudge down, then up, then hide. Anything nudged
  // clear of its dot gets a leader line so the pairing stays legible.
  const placement = useMemo(() => {
    const result: Record<string, { show: boolean; offset: number; leader: boolean }> = {};
    if (!size.w || !size.h) return result;

    const order = [...nodes].sort((a, b) => {
      if (a.c.id === active) return -1;
      if (b.c.id === active) return 1;
      return b.threat - a.threat;
    });
    const dots: Box[] = nodes.map((n) => ({ x1: n.cx - n.r, y1: n.cy - n.r, x2: n.cx + n.r, y2: n.cy + n.r }));
    const placed: Box[] = [];

    const boxAt = (cx: number, cy: number, w: number) => ({
      x1: cx - w / 2 - PAD,
      y1: cy - LABEL_H / 2 - PAD,
      x2: cx + w / 2 + PAD,
      y2: cy + LABEL_H / 2 + PAD,
    });

    for (const n of order) {
      const w = labelWidth(n.c.name);
      const baseY = n.cy + n.r + 4 + LABEL_H / 2; // default: below the dot
      const hits = (cy: number) => {
        const box = boxAt(n.cx, cy, w);
        if (box.y2 > size.h || box.y1 < 0) return true;
        return placed.some((p) => overlaps(p, box)) || dots.some((d) => overlaps(d, box));
      };

      let y = baseY;
      let ok = !hits(y);
      if (!ok) {
        const STEP = 4;
        const MAX = 48;
        for (let off = STEP; off <= MAX && !ok; off += STEP) {
          if (!hits(baseY + off)) {
            y = baseY + off;
            ok = true;
          } else {
            const up = n.cy - n.r - 4 - LABEL_H / 2 - (off - STEP);
            if (!hits(up)) {
              y = up;
              ok = true;
            }
          }
        }
      }

      const isActive = n.c.id === active;
      if (!ok && !isActive) {
        result[n.c.id] = { show: false, offset: 0, leader: false };
        continue;
      }
      if (!ok) y = baseY; // active always shows, on top, even if it overlaps
      placed.push(boxAt(n.cx, y, w));
      result[n.c.id] = { show: true, offset: y - n.cy, leader: Math.abs(y - n.cy) > n.r + LABEL_H };
    }
    return result;
  }, [nodes, size.w, size.h, active]);

  // Rendered only when there's a landscape to plot; the list below owns the
  // loading / empty / error states so nothing is duplicated.
  if (competitors.length < 2) return null;

  return (
    <div className="rise mb-12">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="microlabel">Market map · similarity × threat</p>
        <p className="microlabel hidden text-faint sm:block">
          {selected ? "click empty space to exit focus" : "hover a node · click to focus"}
        </p>
      </div>

      <div
        ref={boardRef}
        onClick={() => setSelected(null)}
        className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] sm:aspect-[16/7]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-border), transparent 30%) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      >
        {/* Quadrant cross */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-4 bottom-4 w-px bg-border" />
          <div className="absolute top-1/2 left-4 right-4 h-px bg-border" />
        </div>

        {/* Axis + quadrant labels */}
        <span className="microlabel pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 text-faint">
          low similarity → high similarity
        </span>
        <span className="microlabel pointer-events-none absolute right-4 top-3 text-faint">Dominant ↑</span>
        <span className="microlabel pointer-events-none absolute bottom-3 left-4 text-faint">Emerging</span>

        {/* Nodes */}
        {nodes.map((n) => {
          const { c, leftPct, topPct, size: dotSize, r } = n;
          const tracking = c.status === "TRACKING";
          const isSelected = selected === c.id;
          const isActive = active === c.id;
          const dimmed = selected != null && !isSelected;
          const place = placement[c.id];
          const showLabel = (place?.show ?? false) && !dimmed;
          const offset = place?.offset ?? r + 4 + LABEL_H / 2;

          return (
            <div
              key={c.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300",
                isActive ? "z-20" : "z-10",
                dimmed && "opacity-35"
              )}
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered((h) => (h === c.id ? null : h))}
            >
              {/* Leader line — tethers a nudged label back to its dot */}
              {showLabel && place?.leader && (
                <span
                  aria-hidden
                  className="absolute left-1/2 w-px -translate-x-1/2 bg-border-strong/40"
                  style={
                    offset > 0
                      ? { top: r, height: Math.max(0, offset - LABEL_H / 2 - r) }
                      : { top: offset + LABEL_H / 2, height: Math.max(0, -r - (offset + LABEL_H / 2)) }
                  }
                />
              )}

              <button
                type="button"
                aria-label={`${c.name} — ${isSelected ? "exit focus" : "focus"}`}
                aria-pressed={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((s) => (s === c.id ? null : c.id));
                }}
                className={cn(
                  "block rounded-full border-2 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  tracking ? "border-accent bg-accent/30" : "border-inference/70 bg-inference/10",
                  isActive && "scale-110"
                )}
                style={{
                  width: dotSize,
                  height: dotSize,
                  boxShadow: tracking ? "0 0 0 5px var(--color-accent-dim)" : undefined,
                }}
              />

              {showLabel && (
                <span
                  className={cn(
                    "pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[7rem] truncate rounded px-1 text-center text-[10px] transition-colors",
                    isActive ? "z-20 bg-surface/80 font-medium text-foreground" : "text-muted"
                  )}
                  style={{ top: offset }}
                >
                  {c.name}
                </span>
              )}

              {isActive && (
                <HoverCard
                  c={c}
                  spark={momentum[c.id]}
                  pending={update.isPending}
                  onCurate={(status) => update.mutate({ id: c.id, status })}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="microlabel mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-accent bg-accent/30" /> tracking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-inference/70 bg-inference/10" /> suggested
        </span>
        <span>node size = threat</span>
      </div>
    </div>
  );
}

function HoverCard({
  c,
  spark,
  pending,
  onCurate,
}: {
  c: CompetitorRow;
  spark?: CompetitorSpark;
  pending: boolean;
  onCurate: (status: "TRACKING" | "DISMISSED") => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-full left-1/2 z-30 mb-3 w-56 -translate-x-1/2 rounded-xl border border-border-strong/30 bg-surface-overlay p-4 shadow-[var(--shadow-lifted)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
        <Link href={`/competitors/${c.id}`} aria-label="Open dossier" className="text-muted hover:text-foreground">
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </Link>
      </div>
      <p className="mt-0.5 truncate font-data text-[11px] text-faint">{c.domain}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <MetricTile size="sm" label="Threat" value={c.threatScore ?? "—"} />
        <MetricTile
          size="sm"
          label="Similarity"
          value={c.similarityScore != null ? `${Math.round(c.similarityScore * 100)}%` : "—"}
        />
      </div>

      {spark && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="microlabel">Momentum</span>
            <span
              className={cn(
                "font-data text-xs",
                spark.trend === "up" ? "text-score" : spark.trend === "down" ? "text-muted" : "text-faint"
              )}
            >
              {trendGlyph(spark.trend)}{" "}
              {spark.trend === "up" ? "heating up" : spark.trend === "down" ? "cooling" : "steady"}
            </span>
          </div>
          <div className="mt-1.5 text-score">
            <Sparkline data={spark.spark} className="h-5 w-full" />
          </div>
          {spark.last && <p className="mt-1.5 truncate text-[11px] text-faint">Last: {spark.last}</p>}
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {c.status !== "TRACKING" && (
          <button
            disabled={pending}
            onClick={() => onCurate("TRACKING")}
            className="h-7 flex-1 rounded-md bg-ink-wash text-xs font-medium text-background transition-colors hover:bg-foreground disabled:opacity-50"
          >
            Track
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => onCurate("DISMISSED")}
          className="h-7 flex-1 rounded-md border border-border text-xs text-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
