# 06 · System Architecture

## Stack

Next.js 15 (App Router) + React 19 + TypeScript strict · Tailwind v4 · Prisma → **Supabase PostgreSQL** · Supabase Auth (@supabase/ssr) · Inngest (durable jobs) · Upstash Redis (optional cache) · TanStack Query · Framer Motion · provider-agnostic AI layer (doc 08).

## The one data path

```
Browser ── React Query ──> Next.js API routes ──> feature services ──> Prisma ──> Supabase Postgres
                                   │
                                   └──> Inngest events ──> job functions ──> feature services ──> Prisma
```

- Application code NEVER queries Postgres directly and NEVER uses `supabase.from()`. Prisma only.
- Supabase clients (`src/lib/supabase/`) exist for **auth** (and later Storage) only.
- Routes are thin: validate (zod) → authorize (`getSessionUser()`) → delegate to a feature service.
- Long-running or scheduled work always runs in Inngest functions (`src/jobs/functions/`), registered in `src/app/api/inngest/route.ts`.

## Folder structure (vertical slices)

```
src/
├── app/            # routes only — no business logic
│   ├── (auth)/     # login, signup       (app)/  # authenticated shell
│   └── api/        # route handlers      auth/callback/  # OAuth exchange
├── components/     # ui/ (primitives) · layout/ · shared/
├── features/<name>/  # components/ hooks/ service.ts types.ts (+ engine files)
├── jobs/           # Inngest client + functions
├── lib/            # ai/ supabase/ db.ts env.ts redis.ts session.ts utils.ts
└── config/         # site.ts navigation.ts
```

Feature modules own their vertical slice. Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.

## Core invariants (violating any of these is an architecture bug)

1. `ai.complete({ task })` is the only AI entry; model names live only in `src/lib/ai/router.ts`.
2. `recordSignal()` is the only signal write path; `enrichSignal()` runs first.
3. `getSessionUser()`/`requireUser()` is the only server auth entry.
4. `@/lib/env` is the only env access (exception: `NEXT_PUBLIC_*` literals for Next inlining).
5. Provenance (`isInference`) is preserved end-to-end, storage → API → UI.

## Background job inventory

| Function | Trigger | Purpose |
| --- | --- | --- |
| `analyze-company` | event `company/analyze.requested` | fetch site → understanding → discovery |
| `send-digests` | cron `* * * * *` | minute-precision digest dispatch (doc 12) |
| `instant-alerts` | event `signal/recorded` | immediate delivery of high-severity signals |
| planned: monitors | cron per source | signal collection (doc 09) |
| planned: reports | cron / event | report generation (doc 11) |
| planned: decision-revisit | cron daily | Decision Memory revisit reminders (doc 15) |

## Caching

`cached(key, ttl, compute)` in `src/lib/redis.ts` — optional; falls through when Redis is unconfigured. Use for scraped pages and expensive AI outputs, never for authorization decisions.
