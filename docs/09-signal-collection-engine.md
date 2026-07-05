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

## Monitor conventions (for future implementations)

One monitor file per source under the owning intel feature (e.g. `features/technology-intel/monitors/…`), scheduled via Inngest cron, idempotent (safe re-runs, dedupe by watermark), and emitting signals only through the pipeline above. Market-wide AI ecosystem items additionally write `AiProviderUpdate` reference rows.
