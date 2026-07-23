import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Activity, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SignalEntry } from "@/components/shared/signal-entry";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/session";
import { getBriefing } from "@/features/dashboard/service";
import { countSignalsSince } from "@/features/signals/service";
import { RetryAnalysis } from "@/features/dashboard/components/retry-analysis";
import { MarkSeen } from "@/features/dashboard/components/mark-seen";
import { LAST_SEEN_COOKIE } from "@/features/dashboard/constants";

export const metadata: Metadata = { title: "Dashboard" };

// The briefing must reflect the market as of this request, never a cached page.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const briefing = await getBriefing(user.id);

  if (!briefing.company) {
    return (
      <>
        <PageHeader
          eyebrow="The briefing"
          title="Your market, read for you"
          description="Signals, threats, and opportunities — delivered with why they matter and what to do."
        />
        <EmptyState
          icon={Sparkles}
          eyebrow="First edition pending"
          title="Add your company to begin"
          description="Enter your website URL and MarketMind AI will map your market, discover competitors, and start monitoring — automatically."
          action={
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center bg-ink-wash px-5 text-sm font-medium text-background transition-colors hover:bg-foreground"
            >
              Start analysis
            </Link>
          }
        />
      </>
    );
  }

  const { company, signalsLastDay, trackedCount, suggestedCount, topThreat, signals } = briefing;
  const analyzing = company.analysisStatus === "PENDING" || company.analysisStatus === "ANALYZING";

  // "New since your last visit" — measured from the per-device cookie the
  // MarkSeen updater stamps on each load (null on the very first visit).
  const lastSeenRaw = (await cookies()).get(LAST_SEEN_COOKIE)?.value;
  const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;
  const newSinceLastVisit =
    lastSeen && !Number.isNaN(lastSeen.getTime())
      ? await countSignalsSince(user.id, lastSeen)
      : 0;

  return (
    <>
      <LiveRefresh />
      <MarkSeen />
      <PageHeader
        eyebrow="The briefing"
        title={company.name ?? company.domain}
        description={company.industry ?? "Your market at a glance — signals, threats, and opportunities."}
      />

      {analyzing && (
        <div className="rise mb-10 border-b border-border pb-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />
            <p className="font-sans text-sm font-medium">
              Fetching your company — please wait
            </p>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            We&apos;re reading your website, understanding your product, and discovering your
            competitors. This usually takes <span className="font-data">1–3 minutes</span> — the
            page updates itself, no need to reload.
          </p>
        </div>
      )}
      {company.analysisStatus === "FAILED" && (
        <div className="rise mb-10 border-b border-border pb-8">
          <p className="text-sm text-critical">
            Analysis could not complete. <RetryAnalysis companyId={company.id} />
          </p>
        </div>
      )}

      {/* Ledger — three figures, hairline-separated */}
      <section aria-label="Key figures" className="rise grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="border-t-2 border-score pt-4">
          <p className="microlabel">Signals · last 24h</p>
          <p className="font-display mt-3 text-5xl">{signalsLastDay}</p>
        </div>
        <div className="border-t-2 border-score pt-4">
          <p className="microlabel">Competitors tracked</p>
          <p className="font-display mt-3 text-5xl">{trackedCount}</p>
          {suggestedCount > 0 && (
            <Link href="/competitors" className="mt-2 inline-block text-xs text-accent hover:underline">
              {suggestedCount} suggested — review →
            </Link>
          )}
        </div>
        <div className="border-t-2 border-score pt-4">
          <p className="microlabel">Highest threat</p>
          {topThreat ? (
            <>
              <p className="font-display mt-3 text-5xl text-score">{topThreat.threatScore}</p>
              <Link
                href={`/competitors/${topThreat.id}`}
                className="mt-2 inline-block text-xs text-muted hover:text-foreground hover:underline"
              >
                {topThreat.name} →
              </Link>
            </>
          ) : (
            <p className="mt-5 text-sm text-faint">Awaiting first assessment</p>
          )}
        </div>
      </section>

      {/* Latest intelligence */}
      <section aria-label="Latest intelligence" className="rise-2 rise mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="font-sans text-sm font-medium">Latest intelligence</h2>
            {newSinceLastVisit > 0 && (
              <Badge variant="live">
                {newSinceLastVisit} new since your last visit
              </Badge>
            )}
          </div>
          <Badge variant="inference">Inferences labeled</Badge>
        </div>
        {signals.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              icon={Activity}
              eyebrow="Monitoring"
              title="No signals yet"
              description={
                trackedCount > 0
                  ? "Monitoring is active. Observations appear here as your market moves — each with why it matters and what to do."
                  : "Track competitors from the landscape page and monitoring begins automatically."
              }
              action={
                trackedCount === 0 ? (
                  <Link href="/competitors" className="text-sm text-accent hover:underline">
                    Review suggested competitors →
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ol className="mt-4 border-t border-border">
            {signals.map((signal) => (
              <SignalEntry
                key={signal.id}
                signal={signal}
                competitorName={signal.competitor?.name}
              />
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
