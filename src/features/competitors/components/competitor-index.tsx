"use client";

import { Radar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useCompetitors,
  useTrackAllCompetitors,
  useUpdateCompetitorStatus,
  type CompetitorRow,
} from "../hooks/use-competitors";

function CompetitorEntry({ competitor, index }: { competitor: CompetitorRow; index: number }) {
  const update = useUpdateCompetitorStatus();
  const suggested = competitor.status === "SUGGESTED";

  return (
    <li className="grid grid-cols-1 gap-4 border-b border-border py-6 sm:grid-cols-12 sm:items-baseline">
      <span aria-hidden className="font-data hidden text-[11px] text-faint sm:col-span-1 sm:block">
        {String(index).padStart(2, "0")}
      </span>

      <div className="sm:col-span-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <Link
            href={`/competitors/${competitor.id}`}
            className="font-sans text-base font-medium text-foreground hover:underline"
          >
            {competitor.name}
          </Link>
          <span className="microlabel">{competitor.domain}</span>
          {suggested && (
            <Badge variant="inference">
              Suggested{competitor.similarityScore != null &&
                ` · ${Math.round(competitor.similarityScore * 100)}%`}
            </Badge>
          )}
          {competitor.status === "TRACKING" && <Badge variant="live">Tracking</Badge>}
        </div>
        {competitor.description && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {competitor.description}
          </p>
        )}
      </div>

      <div className="sm:col-span-3">
        <p className="microlabel mb-1.5">Threat</p>
        {competitor.threatScore != null ? (
          <p className="font-display text-3xl text-score">{competitor.threatScore}</p>
        ) : (
          <p className="text-sm text-faint">Awaiting first assessment</p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:col-span-3 sm:justify-end">
        {suggested && (
          <Button
            size="sm"
            loading={update.isPending && update.variables?.status === "TRACKING"}
            onClick={() => update.mutate({ id: competitor.id, status: "TRACKING" })}
          >
            Track
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          loading={update.isPending && update.variables?.status === "DISMISSED"}
          onClick={() => update.mutate({ id: competitor.id, status: "DISMISSED" })}
        >
          Dismiss
        </Button>
      </div>

      {update.isError && (
        <p className="text-xs text-critical sm:col-span-12">
          {(update.error as Error).message}
        </p>
      )}
    </li>
  );
}

/** The competitive landscape, set as a ledger: suggested first, then tracked. */
export function CompetitorIndex() {
  const { data, isPending, isError, error, refetch } = useCompetitors();
  const trackAll = useTrackAllCompetitors();

  if (isPending) {
    return (
      <div className="flex flex-col gap-px" aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-b border-border py-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rise flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-critical">{(error as Error).message}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const competitors = data.competitors;
  if (competitors.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        title="No competitors yet"
        description="Complete onboarding and MarketMind AI will discover and rank your competitive landscape automatically."
        action={
          <Link href="/onboarding" className="text-sm text-accent hover:underline">
            Add your company →
          </Link>
        }
      />
    );
  }

  const suggested = competitors.filter((c) => c.status === "SUGGESTED");

  return (
    <div className="rise">
      {suggested.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="microlabel">
            {suggested.length} suggested — track the ones that matter, or all of them
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={trackAll.isPending}
            onClick={() => trackAll.mutate(suggested.map((c) => c.id))}
          >
            {trackAll.isPending ? "Tracking…" : `Track all ${suggested.length}`}
          </Button>
          {trackAll.isError && (
            <p className="w-full text-xs text-critical">
              Some competitors couldn&apos;t be tracked — the list below shows what went through.
            </p>
          )}
        </div>
      )}
      <ol className="border-t border-border">
        {competitors.map((competitor, i) => (
          <CompetitorEntry key={competitor.id} competitor={competitor} index={i + 1} />
        ))}
      </ol>
    </div>
  );
}
