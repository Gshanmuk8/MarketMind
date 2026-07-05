# 13 · Search Engine

Status: 📋 planned.

## Purpose

Two complementary modes:

1. **Instant search (⌘K command palette)** — find any entity fast: competitors, signals, tech stack entries, reports, decisions, AI provider updates, navigation actions. Built with `cmdk` (already a dependency) in the topbar's search affordance.
2. **Conversational search** — questions ("What pricing changes happened this month?") are not search queries; they route to Chat (doc FR-7), which answers like a senior strategist grounded in collected evidence.

## MVP implementation plan

- Postgres full-text search through Prisma (`to_tsvector` expression indexes on signals.title/summary, competitors.name/description, reports.title/executiveSummary, decisions.title/context) behind `GET /api/search?q=`.
- Results grouped by entity type with severity/provenance markers, max ~8 per group, ranked by `ts_rank` + recency.
- All queries user-scoped via `getSessionUser()` (doc 19) — search must never leak across users.

## Later

- pgvector embeddings for semantic recall ("competitors doing agents") — Supabase supports pgvector natively.
- Searching an unknown term (e.g. a company not tracked) offers an AI-powered "Analyze <term>" action that spins up an ad-hoc analysis.

## UX rules

- Palette opens with ⌘K / Ctrl+K everywhere in the app shell; Esc closes; full keyboard navigation.
- Empty query shows recent entities and quick actions; zero-results state offers the conversational fallback ("Ask MarketMind: …").
