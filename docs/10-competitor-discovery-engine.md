# 10 · Competitor Discovery Engine

## Purpose

The user never searches for competitors. From the Company Understanding Engine's profile, the platform proposes a ranked, confidence-scored competitive landscape the user can accept, reject, or extend.

## Stage 1 — Company Understanding (`features/company-analysis`)

`fetchCompanyPage(url)` retrieves and de-tags public site content (future: multi-page crawl — homepage, pricing, docs, sitemap). `analyzeCompany()` produces the structured `CompanyAnalysis`: name, industry, description, business model, target audience, features, keywords, technologies. Persisted to `Company` (+ full JSON in `Company.analysis`); user-editable afterwards (FR-1.4).

## Stage 2 — Discovery (`features/competitor-discovery`)

`discoverCompetitors(analysis)` reasons over the profile and returns up to 10 real, operating companies, each with `{ name, url, reason, confidence }`. Persisted as `Competitor` rows with `status: SUGGESTED`, `similarityScore = confidence`, dedup by `@@unique([companyId, domain])`.

Future enrichment (documented intent, not yet built): corroborate candidates against public search sources (Product Hunt, G2, Crunchbase, Reddit, GitHub) and boost/penalize confidence by corroboration count. AI reasoning proposes; public sources verify.

## Stage 3 — User review

SUGGESTED competitors render with confidence scores; user actions: **Track** (→ TRACKING, monitoring begins), **Dismiss** (→ DISMISSED, excluded from scores/digests, kept to avoid re-suggesting), **Add manually** (any URL → same enrichment path).

## Stage 4 — Profile enrichment (per TRACKING competitor)

Build the full profile over time: tech stack detection (→ TechStackEntry), pricing/funding/team facts (verified where public, inference otherwise), initial threat ScoreSnapshot, and the AI strategic summary. Every enrichment writes through the signal pipeline (doc 09) so profile changes also appear in the feed.

## Pipeline placement

All stages run inside the `analyze-company` Inngest function (durable, step-retried). API route `POST /api/companies` only creates the row and emits the event.

## Quality bars

- Confidence is honest: no invented companies; discovery output is inference until corroborated.
- Discovery must never block onboarding: failures mark `analysisStatus: FAILED` with a retry affordance.

## Competitor Activity Timeline (additive, dossier)

A per-competitor **activity timeline** + **adoption/usage intelligence** surfaced on the dossier (`/competitors/[id]`), strictly additive — the existing analysis, signals, insights, tech, and scoring are untouched.

- **Content**: four rolling windows — **last 24h / 7d / 30d / 365d** — each a short narrative + itemized activity across product, pricing, marketing, sales, funding, partnerships, hiring, engineering, community, etc. Plus an **adoption** block (use cases, popular features, industries, sentiment, community themes, pain points, requested features). It is an **AI inference** (labeled as such); items grounded in our collected `Signal` stream are marked `observed`, the rest are public-knowledge inference. The factual signal stream stays in the existing "Recent developments" section.
- **Generation**: `features/competitor-timeline/service.ts` → `generateTimeline(competitorId)` — one `ai.complete({ task: "summarization" })` grounded in the company profile + the competitor's real bucketed signals. Cached in `Competitor.profile.timeline` (`{ data, generatedAt, model }`) — **no schema migration** (profile is JSON). A freshness guard (<20h) makes regeneration idempotent.
- **Auto-refresh (rolling)**: daily cron `refresh-timelines` enqueues `timeline/generate.requested` for TRACKING competitors whose cache is stale (>24h), so every window stays current without a visit. Opening a dossier lazily enqueues generation too if the cache is missing/stale.
- **Delivery**: thin `GET /api/competitors/[id]/timeline` returns the cache (ownership-scoped) and enqueues a refresh when stale; the client lazy-loads after the dossier opens, shows a loading state, polls until fresh, and degrades gracefully when data is unavailable.
