import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/layout/logo";
import { SessionRedirect } from "@/features/auth/components/session-redirect";
import { siteConfig } from "@/config/site";

const method = [
  {
    n: "01",
    title: "Understand",
    body: "One URL in. The engine reads your product the way an analyst would.",
  },
  {
    n: "02",
    title: "Discover",
    body: "Your competitive landscape is mapped and ranked — before your coffee cools.",
  },
  {
    n: "03",
    title: "Monitor",
    body: "Thousands of public signals, read continuously, around the clock.",
  },
  {
    n: "04",
    title: "Decide",
    body: "Every signal arrives with why it matters and what to do about it.",
  },
];

/**
 * The landing page is set like the cover and first spread of a privately
 * printed intelligence briefing — editorial, asymmetric, quiet.
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Safety net: if Supabase's redirect allow-list falls back to the Site URL
  // with an auth code, complete the sign-in instead of showing the cover.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/onboarding`);

  return (
    <main className="min-h-dvh">
      {/* Confirmation links may land here with hash tokens — finish sign-in. */}
      <SessionRedirect to="/dashboard" />
      {/* Folio line */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="font-display text-lg tracking-tight">MarketMind</span>
          </span>
          <div className="flex items-center gap-6">
            <p className="microlabel hidden sm:block">Private preview</p>
            <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Cover */}
      <section className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-16 py-16 sm:py-24 lg:grid-cols-12 lg:py-32">
          <div className="rise lg:col-span-7">
            <p className="microlabel mb-8">A briefing, not a dashboard</p>
            <h1 className="text-4xl leading-[1.08] sm:text-6xl lg:text-7xl">
              Know your market before&nbsp;it&nbsp;moves.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
              {siteConfig.name} reads everything your market publishes and returns
              one thing: what changed, why it matters, and what to do next.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center gap-3 bg-ink-wash px-7 text-base font-medium text-background transition-colors hover:bg-foreground"
              >
                Analyze my company
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </Link>
              <p className="microlabel">One URL · ~60 seconds</p>
            </div>
          </div>

          {/* Annotation column — the method, set as marginalia */}
          <div className="rise-2 rise lg:col-span-4 lg:col-start-9">
            <ol className="border-t border-border">
              {method.map((step) => (
                <li key={step.n} className="border-b border-border py-6">
                  <div className="flex items-baseline gap-4">
                    <span aria-hidden className="font-data text-[11px] text-accent">
                      {step.n}
                    </span>
                    <div>
                      <h2 className="font-sans text-sm font-medium">{step.title}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Specimen — one signal, typeset as it arrives in the product */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 sm:py-24 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-4">
            <p className="microlabel mb-4">Specimen</p>
            <h2 className="text-3xl leading-snug">
              Every signal arrives already&nbsp;thought&nbsp;through.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Raw events never reach you. Facts, inferences, and recommendations
              are kept distinct — always.
            </p>
          </div>

          <article className="rise lg:col-span-7 lg:col-start-6">
            <div className="border border-border bg-surface-overlay p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <p className="microlabel">Signal · Competitor pricing</p>
                <Badge variant="critical">Important</Badge>
              </div>
              <h3 className="mt-5 font-sans text-base font-medium leading-relaxed">
                Acme launched a free tier with 10,000 requests per month.
              </h3>
              <p className="mt-1 text-xs text-faint">Verified — acme.com/pricing</p>

              <hr className="rule my-6" />

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="microlabel">Why it matters</p>
                    <Badge variant="inference">AI inference · 87%</Badge>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    Their free tier now covers your starter plan&apos;s core use case,
                    putting direct pressure on your entry pricing.
                  </p>
                </div>
                <div>
                  <p className="microlabel">Recommended action</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    Differentiate the starter plan on support and rate limits
                    rather than matching on price this quarter.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-16 sm:py-24 lg:px-10">
          <h2 className="max-w-2xl text-3xl leading-snug sm:text-4xl">
            The first thing you open every morning.
          </h2>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center gap-3 rounded-md border border-border-strong px-7 text-base font-medium transition-colors hover:bg-surface-raised"
          >
            Begin the briefing
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Colophon */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 lg:px-10">
          <p className="microlabel">{siteConfig.name} — {siteConfig.tagline}</p>
          <p className="microlabel">Public sources only</p>
        </div>
      </footer>
    </main>
  );
}
