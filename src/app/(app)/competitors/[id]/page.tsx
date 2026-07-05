import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SignalEntry } from "@/components/shared/signal-entry";
import { getSessionUser } from "@/lib/session";
import { getCompetitor } from "@/features/competitors/service";

export const metadata: Metadata = { title: "Competitor profile" };

/** Full competitor dossier: threat breakdown and the signal record. */
export default async function CompetitorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const competitor = await getCompetitor(user.id, id);
  if (!competitor) notFound();

  const snapshot = competitor.scoreSnapshots[0];
  const breakdown = (snapshot?.breakdown ?? null) as Record<string, number> | null;

  return (
    <>
      <PageHeader eyebrow={`Dossier · ${competitor.domain}`} title={competitor.name}>
        {competitor.status === "TRACKING" ? (
          <Badge variant="live">Tracking</Badge>
        ) : (
          <Badge>{competitor.status.toLowerCase()}</Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Annotation column */}
        <aside className="rise lg:col-span-4">
          {competitor.description && (
            <p className="text-sm leading-relaxed text-muted">{competitor.description}</p>
          )}

          <dl className="mt-8 border-t border-border">
            <div className="flex items-baseline justify-between border-b border-border py-4">
              <dt className="microlabel">Threat score</dt>
              <dd className="font-display text-4xl text-score">
                {competitor.threatScore ?? "—"}
              </dd>
            </div>
            {competitor.similarityScore != null && (
              <div className="flex items-baseline justify-between border-b border-border py-4">
                <dt className="microlabel">Similarity</dt>
                <dd className="font-data text-sm">
                  {Math.round(competitor.similarityScore * 100)}%
                </dd>
              </div>
            )}
            {breakdown &&
              Object.entries(breakdown).map(([factor, value]) => (
                <div
                  key={factor}
                  className="flex items-baseline justify-between border-b border-border py-3"
                >
                  <dt className="text-xs capitalize text-muted">{factor}</dt>
                  <dd className="font-data text-xs text-muted">{value}</dd>
                </div>
              ))}
          </dl>
          {snapshot && (
            <p className="microlabel mt-3">
              Assessed {snapshot.capturedAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              {" · "}
              <Badge variant="inference">AI inference</Badge>
            </p>
          )}
        </aside>

        {/* Signal record */}
        <section className="rise-1 rise lg:col-span-8">
          <p className="microlabel mb-2">Signal record</p>
          {competitor.signals.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No signals recorded"
              description={
                competitor.status === "TRACKING"
                  ? "Monitoring is active — observations will appear here as the market moves."
                  : "Track this competitor to begin monitoring its public footprint."
              }
            />
          ) : (
            <ol className="border-t border-border">
              {competitor.signals.map((signal) => (
                <SignalEntry key={signal.id} signal={signal} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
