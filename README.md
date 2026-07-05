# MarketMind AI

**AI-Powered Competitive Intelligence Platform**

A founder enters their company website once. Within a minute, MarketMind AI understands the company, discovers its competitors, and begins monitoring thousands of public signals — converting them into threat scores, opportunities, and strategic recommendations.

Not a competitor tracker. An AI strategy platform.

> **This repository is documentation-driven.** `/docs` is the single source of truth — start with [`docs/00-development-rules.md`](docs/00-development-rules.md) and read the suite in numbered order before contributing.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (dark-only design system in `globals.css`) |
| UI | Custom primitives + Framer Motion + Recharts + lucide-react |
| Data | Supabase PostgreSQL via Prisma — Prisma is the only data path |
| Auth | Supabase Auth (email, Google, GitHub) via @supabase/ssr |
| Storage | Supabase Storage (logos, report PDFs, avatars) |
| Jobs | Inngest (durable pipelines: analysis, monitors, digests) |
| Cache | Upstash Redis (optional in dev) |
| AI | Provider-agnostic layer — OpenRouter gateway + 6 direct providers |

## Getting started

```bash
npm install
cp .env.example .env        # fill in Supabase + OpenRouter values (see docs/SUPABASE.md)
npm run db:push             # sync Prisma schema to Supabase Postgres
# then run prisma/rls.sql in the Supabase SQL editor (Row Level Security)
npm run dev                 # http://localhost:3000
npx inngest-cli@latest dev  # (separate terminal) local job runner
```

Minimum env to run: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`. Full setup: `docs/SUPABASE.md`.

## Architecture

```
src/
├── app/                  # Routes only — thin, no business logic
│   ├── (auth)/           # login, signup
│   ├── (app)/            # authenticated shell: dashboard, competitors, …
│   └── api/              # route handlers (auth, companies, inngest)
├── components/
│   ├── ui/               # design-system primitives (button, card, badge…)
│   ├── layout/           # sidebar, topbar
│   └── shared/           # page-header, empty-state
├── features/             # vertical slices — each owns components/hooks/service
│   ├── company-analysis/     # AI Company Understanding Engine
│   ├── competitor-discovery/ # automatic competitor discovery
│   ├── signals/              # unified intelligence event stream (single write path)
│   ├── scoring/              # threat & opportunity scoring
│   └── …                     # tech-intel, ai-intel, hiring, seo, social, customer, reports, chat
├── jobs/                 # Inngest client + durable pipeline functions
├── lib/
│   ├── ai/               # provider abstraction: registry, router, streaming
│   ├── supabase/         # Supabase clients (auth only — data goes via Prisma)
│   ├── session.ts        # getSessionUser() — the single auth entry point
│   ├── db.ts / redis.ts / env.ts
└── config/               # site metadata, navigation
```

### Core principles

1. **Everything is a Signal.** Every observation — pricing change, funding round, new model release — is one row in a unified event stream, tagged by category, severity, and provenance.
2. **Facts vs. inferences.** `isInference` is tracked on every signal and surfaced in the UI (the `inference` badge variant). Verified public facts and AI-reasoned conclusions are never conflated.
3. **No hardcoded models.** Business logic calls `ai.complete({ task })`. The routing table in `src/lib/ai/router.ts` is the only file that knows model names, with automatic provider fallback.
4. **Routes are thin.** Pages and API handlers delegate to feature services; heavy work runs in Inngest jobs.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server (Turbopack) |
| `npm run build` / `start` | production |
| `npm run typecheck` / `lint` / `format` | quality gates |
| `npm run db:push` / `db:migrate` / `db:studio` | Prisma workflows |
