# 09 · Signal Collection Engine

## Purpose

Turn the public internet into a single, enriched, user-scoped event stream. Everything downstream — dashboard feed, digests, alerts, reports, chat grounding, decision evidence — reads from Signals.

## Sources (public, legal, ethical only)

Company websites · release notes · pricing pages · changelogs/docs · GitHub (repos, releases, stars, commits) · Product Hunt · blogs/RSS · careers pages · official announcements · public news · reviews (G2, Capterra, Trustpilot, app stores) · Reddit/HN/X/LinkedIn public posts · AI provider announcements.

Rules: honor robots.txt and rate limits; identify as `MarketMindBot`; never collect gated, private, or paywalled content; never pretend to know private information.

## The pipeline

```
Monitor (per source, Inngest cron)
  → collect raw items
  → dedupe (hash of source+identity; Redis-cached watermarks)
  → enrichSignal()        ← the Intelligence Layer (mandatory)
  → recordSignal()        ← the only write path
  → (IMPORTANT/CRITICAL) emit signal/recorded → instant alerts
```

## The Intelligence Layer (`features/signals/intelligence.ts`)

`enrichSignal(rawEvent, companyContext)` transforms **Raw Event → Context → Business Impact → Strategic Meaning → Recommendation**, returning severity, `whyItMatters` (tied to THIS company), `recommendation`, and confidence. No signal is stored without passing through it. Enrichment output is an AI inference by definition.

### Severity rubric (enforced in the prompt)

- **CRITICAL** — demands same-week attention (direct competitor pivots into your core, pricing war, category-shifting AI release).
- **IMPORTANT** — should influence current planning (major feature launch, funding round, key capability adoption).
- **NOTABLE** — worth knowing this week.
- **INFO** — background awareness.

## Classification

- `category`: one of 13 `SignalCategory` values.
- `topic`: fine-grained notification key (`tech.openai`, `competitor.pricing`, `hiring.ai_engineer` — taxonomy in `features/notifications/types.ts`). Monitors should always set it.
- Provenance: the *event* may be a verified fact (`isInference: false` + sourceUrl); the enrichment fields are always inference.

## Monitor conventions

One monitor file per source under `features/monitoring/sources/`, scheduled via Inngest cron (`run-monitors` for competitor-scoped sources, `ecosystem-sweep` for market-wide), idempotent (safe re-runs, dedupe by watermark), and emitting signals only through the pipeline above. Market-wide AI ecosystem items additionally write `AiProviderUpdate` reference rows.

## Shipped monitors

Per TRACKING competitor, `run-monitors` sweeps each source in its own durable Inngest step (an error in one never disables the others for that competitor):

- **Website** (`sources` via `monitoring/service.ts`) — homepage content-hash watermark; AI-diffs snapshots into change events. Watermark advances only **after** signals are recorded, with a title-based dedupe guard so a retried step can't double-post.
- **GitHub** (`sources/github.ts`) — public-org releases in the trailing 7 days. Org ownership is verified against the org's declared website before its releases are attributed (a name-collision org is never trusted). Releases are verified facts (`isInference: false`).
- **Pricing** (`sources/pricing.ts`) — resolves the competitor's pricing/plans page, AI-extracts a **structured plan snapshot** (`{ plan, price, cadence, highlights }[]`) cached in `Competitor.profile.pricing`, and diffs it against the prior snapshot. Plan/price changes emit `PRICING` signals (topic `competitor.pricing`); the extracted diff is an inference (`isInference: true`). First observation stores the baseline silently.
- **Careers** (`sources/careers.ts`) — resolves the competitor's careers/jobs page, AI-extracts open roles, and surfaces **roadmap-revealing** hires (e.g. "hiring 3 ML engineers" ⇒ building AI) as `HIRING` signals (topic `hiring.*`). Role set is cached in `Competitor.profile.careers`; only newly appeared, strategically-telling roles are recorded, as inferences.

Market-wide: **Ecosystem** (`sources/ecosystem.ts`) AI-filters tech/AI/research feeds per company. Its summaries are model-written from headlines alone, so they are inferences (`isInference: true`).
