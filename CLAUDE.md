# MarketMind AI — Engineering Conventions

AI-powered competitive intelligence platform. Next.js 15 App Router, TypeScript strict, Tailwind v4, Prisma + Postgres, Inngest, provider-agnostic AI layer.

## Documentation-first (non-negotiable)

This repository is **documentation-driven**: `/docs` is the single source of truth, and `docs/00-development-rules.md` governs how all work happens here. At the start of every task: read the `/docs` suite in its numbered order (00–20); before writing code, state which docs are relevant and verify the plan against them; if implementation would conflict with a document, STOP and surface the conflict — never silently diverge. When behavior or architecture must change, update the doc first (propose + get approval for product/architecture changes), then the code. After every task: verify against the docs, then run typecheck, lint, and build — all must pass.

Every feature must pass the manifesto's test (`docs/01-product-manifesto.md`): "does this help the founder decide what to build, what to ignore, and what to do next?"

## Hard rules

- **The Intelligence Layer is mandatory.** Raw events are never surfaced. Monitors call `enrichSignal()` before `recordSignal()` so every signal carries `whyItMatters` + `recommendation` (Raw Event → Context → Impact → Meaning → Recommendation).

- **Never hardcode AI model or provider names in business logic.** Call `ai.complete({ task })` from `@/lib/ai`. Model names live only in `src/lib/ai/router.ts`.
- **Every intelligence observation goes through `recordSignal()`** (`src/features/signals/service.ts`) — never write to the `Signal` table directly elsewhere.
- **Mark provenance.** AI-reasoned conclusions set `isInference: true` (+ confidence); verified public facts set `false`. The UI must always distinguish them (use the `inference` badge variant).
- **Routes stay thin.** Pages/API handlers validate + delegate to `src/features/*/service.ts`. Long-running work goes to Inngest jobs in `src/jobs/functions/`.
- **Backend standard: Next.js → Prisma → Supabase PostgreSQL.** Prisma is the ONLY data path — never `supabase.from()`, never raw SQL from app code. Supabase clients (`@/lib/supabase`) are for auth only.
- **Server auth only via `getSessionUser()`/`requireUser()`** (`@/lib/session.ts`). Every query touching user data must be scoped by `userId` (or its parent chain) — RLS (`prisma/rls.sql`) is the second lock, not a substitute.
- **Env access only via `@/lib/env`** (zod-validated), never `process.env` directly. Exception: `NEXT_PUBLIC_*` literals in client components/middleware for Next.js inlining.
- Feature modules are vertical slices (`components/`, `hooks/`, `service.ts`, `types.ts`). No deep imports across features.

## Design system — "Atelier" (light, editorial)

- Light theme only (owner decision, 2026-07). "Pressroom" palette — true ink on gallery white, vermilion signature, Kawoszeh (fallback Marcellus) display serif; tokens live in `src/app/globals.css` `@theme` — use token classes (`bg-surface`, `text-muted`, `border-border`, `text-accent`), never raw hex in components.
- Color is semantic and sparse: vermilion (`accent`) = primary/positive, deep teal (`live`) = live data/links, cobalt (`score`) = scores, dark amber (`warning`) = warnings only, crimson (`critical`) = critical only, zinc (`inference`) = AI inferences. No blue floods/neon; no gradients, glass, or glows.
- Typography: Kawoszeh (fallback Marcellus) for display headings (`font-display`), Inter body, JetBrains Mono for numbers (`.font-data`, tabular) and `.microlabel` eyebrows.
- Editorial layout: hairline rules and whitespace over boxes; numbered index navigation; museum spacing (see docs 16–17).
- Every list/detail screen needs proper loading (Skeleton), empty (EmptyState), and error states.

## Workflow

- `npm run typecheck`, `npm run lint`, and `npm run build` must pass before considering work done.
- Prisma schema changes: edit `prisma/schema.prisma` → `npm run db:push` (dev) → `npm run db:generate` → add RLS policies for new user-owned tables in `prisma/rls.sql`.
- Register new Inngest functions in `src/app/api/inngest/route.ts`; document new routes/events in `docs/18-api-specification.md`.
