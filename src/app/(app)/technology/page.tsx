import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cpu } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SignalEntry } from "@/components/shared/signal-entry";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { getSessionUser } from "@/lib/session";
import { listSignalsByCategory } from "@/features/signals/service";

export const metadata: Metadata = { title: "Technology Intelligence" };
export const dynamic = "force-dynamic";

/** Tech-trend and engineering signals: market feeds + competitor releases. */
export default async function TechnologyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // AI Intelligence merged here: one frontier feed for tech + AI + engineering.
  const signals = await listSignalsByCategory(user.id, ["TECHNOLOGY", "ENGINEERING", "AI_MODELS"], 40);

  return (
    <>
      <LiveRefresh />
      <PageHeader
        title="Technology Intelligence"
        description="Frontier tech as it breaks — AI and AGI progress, quantum computing, major lab announcements — plus your competitors' engineering activity. Updates automatically."
      />
      {signals.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No technology signals yet"
          description="Frontier-tech feeds (MIT Technology Review, arXiv quantum, Ars Technica) and the competitor GitHub monitor fill this page — the next sweep is already scheduled."
        />
      ) : (
        <ol className="rise border-t border-border">
          {signals.map((signal) => (
            <SignalEntry key={signal.id} signal={signal} competitorName={signal.competitor?.name} />
          ))}
        </ol>
      )}
    </>
  );
}
