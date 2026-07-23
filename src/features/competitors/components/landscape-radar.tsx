"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Sparkline, trendGlyph } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";
import {
  useCompetitors,
  useUpdateCompetitorStatus,
  type CompetitorRow,
  type CompetitorSpark,
} from "../hooks/use-competitors";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Landscape Radar — the competitive market, read as a map rather than a list.
 * Each competitor is a node positioned by similarity (x) × threat (y), sized
 * by threat. An editorial "market intelligence" overview that sits above the
 * curation list (which keeps every track/dismiss action). Light Vellum — the
 * analysis surface — while the individual dossier is the dark terminal.
 */
export function LandscapeRadar() {
  const { data } = useCompetitors();
  const update = useUpdateCompetitorStatus();
  const [hovered, setHovered] = useState<string | null>(null);

  const competitors = data?.competitors ?? [];
  const momentum = data?.momentum ?? {};
  // Rendered only when there's a landscape to plot; the list below owns the
  // loading / empty / error states so nothing is duplicated.
  if (competitors.length < 2) return null;

  const nodes = competitors.map((c) => {
    const x = clamp01(c.similarityScore ?? 0.5);
    const y = clamp01((c.threatScore ?? 0) / 100);
    return {
      c,
      left: 8 + x * 84, // %, padded off the edges
      top: 10 + (1 - y) * 80, // %, inverted so high threat sits high
      size: 18 + Math.round(y * 30), // 18–48px
    };
  });

  return (
    <div className="rise mb-12">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="microlabel">Market map · similarity × threat</p>
        <p className="microlabel hidden text-faint sm:block">hover a node · click to open</p>
      </div>

      <div
        className="relative aspect-[16/11] w-full rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] sm:aspect-[16/7]"
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
        <span className="microlabel absolute bottom-2.5 left-1/2 -translate-x-1/2 text-faint">
          low similarity → high similarity
        </span>
        <span className="microlabel absolute right-4 top-3 text-faint">Dominant ↑</span>
        <span className="microlabel absolute bottom-3 left-4 text-faint">Emerging</span>

        {/* Nodes */}
        {nodes.map(({ c, left, top, size }) => {
          const tracking = c.status === "TRACKING";
          const isHover = hovered === c.id;
          return (
            <div
              key={c.id}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2", isHover ? "z-20" : "z-10")}
              style={{ left: `${left}%`, top: `${top}%` }}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered((h) => (h === c.id ? null : h))}
            >
              <Link
                href={`/competitors/${c.id}`}
                aria-label={`${c.name} — open dossier`}
                className={cn(
                  "block rounded-full border-2 transition-transform duration-200 hover:scale-110",
                  tracking
                    ? "border-accent bg-accent/30"
                    : "border-inference/70 bg-inference/10"
                )}
                style={{
                  width: size,
                  height: size,
                  boxShadow: tracking ? "0 0 0 5px var(--color-accent-dim)" : undefined,
                }}
              />
              <span
                className={cn(
                  "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px]",
                  isHover ? "text-foreground" : "text-muted"
                )}
              >
                {c.name}
              </span>

              {isHover && (
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
    <div className="absolute bottom-full left-1/2 z-30 mb-3 w-56 -translate-x-1/2 rounded-xl border border-border-strong/30 bg-surface-overlay p-4 shadow-[var(--shadow-lifted)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
        <Link href={`/competitors/${c.id}`} aria-label="Open dossier" className="text-muted hover:text-foreground">
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </Link>
      </div>
      <p className="mt-0.5 truncate font-data text-[11px] text-faint">{c.domain}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div>
          <p className="microlabel">Threat</p>
          <p className="font-data mt-0.5 text-lg text-score">{c.threatScore ?? "—"}</p>
        </div>
        <div>
          <p className="microlabel">Similarity</p>
          <p className="font-data mt-0.5 text-lg text-foreground">
            {c.similarityScore != null ? `${Math.round(c.similarityScore * 100)}%` : "—"}
          </p>
        </div>
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
