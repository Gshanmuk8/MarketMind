"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  TIMELINE_WINDOWS,
  type AdoptionIntel,
  type TimelineResponse,
  type TimelineWindow,
} from "@/features/competitor-timeline/types";

/**
 * Competitor Activity Timeline (doc 10) — additive dossier section. Lazy,
 * cached, and self-refreshing: it fetches the cached four-window timeline,
 * polls while a generation is in flight, and degrades gracefully when a
 * window has nothing real to show. Purely presentational over the API.
 */
export function ActivityTimeline({ competitorId }: { competitorId: string }) {
  const [active, setActive] = useState<TimelineWindow>("day");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["competitor-timeline", competitorId],
    queryFn: async (): Promise<TimelineResponse> => {
      const res = await fetch(`/api/competitors/${competitorId}/timeline`);
      if (!res.ok) throw new Error("Could not load the activity timeline.");
      return res.json();
    },
    // Poll while the timeline is still being compiled/refreshed; stop once ready.
    refetchInterval: (query) => (query.state.data?.status === "ready" ? false : 8000),
    staleTime: 60_000,
  });

  const timeline = data?.timeline ?? null;
  const generating = !timeline && data?.status !== "unavailable";
  const refreshing = Boolean(timeline) && data?.status === "refreshing";

  return (
    <section className="mt-16" aria-label="Competitor activity timeline">
      {/* Header — eyebrow, provenance, freshness */}
      <div className="border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Clock className="size-4 text-accent" strokeWidth={1.5} />
          <p className="microlabel">Activity timeline</p>
          <Badge variant="inference">AI inference</Badge>
          {refreshing && (
            <span className="flex items-center gap-1.5 text-xs text-faint">
              <Spinner className="size-3" label="Refreshing" /> refreshing
            </span>
          )}
          {data?.generatedAt && (
            <span className="font-data ml-auto text-xs text-faint">
              Updated {timeAgo(data.generatedAt)}
            </span>
          )}
        </div>
        {/* subtle premium accent hairline */}
        <div aria-hidden className="mt-3 h-px w-full bg-gradient-to-r from-accent/40 via-border to-transparent" />
      </div>

      {isError ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted">The activity timeline couldn&apos;t be loaded.</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-accent underline underline-offset-2 hover:text-foreground"
          >
            Try again
          </button>
        </div>
      ) : (isPending || generating) ? (
        <TimelineSkeleton first={!timeline && data?.status !== "refreshing"} />
      ) : timeline ? (
        <>
          {/* Window segmented control */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {TIMELINE_WINDOWS.map((w) => {
              const count = timeline.buckets[w.key]?.items.length ?? 0;
              const on = active === w.key;
              return (
                <button
                  key={w.key}
                  onClick={() => setActive(w.key)}
                  aria-pressed={on}
                  className={cn(
                    "group rounded-lg border px-3.5 py-2 text-left transition-all duration-200",
                    on
                      ? "border-border-strong bg-surface-raised shadow-[var(--shadow-soft)]"
                      : "border-border bg-transparent hover:border-border-strong hover:bg-surface-raised/50"
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium transition-colors",
                      on ? "text-foreground" : "text-muted group-hover:text-foreground"
                    )}
                  >
                    {w.label}
                  </span>
                  <span className="font-data mt-0.5 block text-[11px] text-faint">
                    {count > 0 ? `${count} ${count === 1 ? "item" : "items"}` : w.blurb}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active window */}
          <div key={active} className="rise mt-7">
            {timeline.buckets[active]?.summary && (
              <p className="mb-6 max-w-3xl text-[15px] leading-relaxed text-foreground">
                {timeline.buckets[active].summary}
              </p>
            )}

            {timeline.buckets[active]?.items.length ? (
              <ol className="space-y-3">
                {timeline.buckets[active].items.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-border-strong hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="microlabel text-accent">{item.category}</span>
                      {item.observed ? (
                        <Badge variant="live">observed</Badge>
                      ) : (
                        <span className="text-[11px] text-faint">inferred</span>
                      )}
                    </div>
                    <h4 className="mt-2 font-sans text-sm font-medium text-foreground">{item.title}</h4>
                    {item.detail && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.detail}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-faint">
                <Activity className="size-4" strokeWidth={1.5} />
                No notable activity recorded in this window yet.
              </div>
            )}
          </div>

          <AdoptionPanel adoption={timeline.adoption} />
        </>
      ) : (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-dashed border-border px-5 py-10 text-sm text-faint">
          <Activity className="size-4" strokeWidth={1.5} />
          Activity intelligence isn&apos;t available for this competitor yet.
        </div>
      )}
    </section>
  );
}

/* ── adoption & usage ────────────────────────────────────────────────── */

function AdoptionPanel({ adoption }: { adoption: AdoptionIntel }) {
  const chipCards: { title: string; values: string[] }[] = [
    { title: "Popular features", values: adoption.popularFeatures },
    { title: "Common use cases", values: adoption.useCases },
    { title: "Industries adopting", values: adoption.industries },
    { title: "Community themes", values: adoption.communityThemes },
    { title: "Pain points", values: adoption.painPoints },
    { title: "Frequently requested", values: adoption.requestedFeatures },
  ].filter((c) => c.values.length > 0);

  if (chipCards.length === 0 && !adoption.sentiment) return null;

  return (
    <div className="mt-14">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <Users className="size-4 text-accent" strokeWidth={1.5} />
        <p className="microlabel">Adoption &amp; usage</p>
        <Badge variant="inference">AI inference</Badge>
      </div>

      {adoption.sentiment && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-score" strokeWidth={1.5} />
          <div>
            <p className="microlabel mb-1.5">User sentiment</p>
            <p className="text-sm leading-relaxed text-foreground">{adoption.sentiment}</p>
          </div>
        </div>
      )}

      {chipCards.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {chipCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:shadow-[var(--shadow-soft)]"
            >
              <p className="microlabel mb-3">{card.title}</p>
              <div className="flex flex-wrap gap-2">
                {card.values.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs text-muted"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── loading ─────────────────────────────────────────────────────────── */

function TimelineSkeleton({ first }: { first: boolean }) {
  return (
    <div className="mt-8" aria-busy>
      <div className="flex items-center gap-2.5 text-sm text-faint">
        <Spinner className="size-4 text-accent" label="Compiling" />
        {first ? "Compiling the activity timeline — this first run takes up to a minute…" : "Refreshing…"}
      </div>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {TIMELINE_WINDOWS.map((w) => (
          <div key={w.key} className="h-12 w-32 rounded-lg border border-border bg-border/40" />
        ))}
      </div>
      <div className="mt-7 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-border/30" />
        ))}
      </div>
    </div>
  );
}

/* ── util ────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
