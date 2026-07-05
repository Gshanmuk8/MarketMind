# 19 · Security Architecture

## Identity & sessions (Supabase Auth)

- Providers: email/password, Google, GitHub — configured in the Supabase dashboard, not env.
- `src/middleware.ts` refreshes tokens on every matched app route and redirects anonymous visitors to `/login`.
- Server code trusts only `supabase.auth.getUser()` (JWT verified against Supabase), never `getSession()` cookie parsing. The sole entry point is **`getSessionUser()` / `requireUser()`** (`src/lib/session.ts`), which also lazily mirrors the user into `public.profiles`.
- OAuth code exchange happens server-side at `/auth/callback`.

## Authorization — two independent locks

1. **Application lock (primary):** every Prisma query touching user data is scoped by `userId` or its parent chain (company → competitor → …). Ownership-checked mutations use `updateMany/deleteMany + count` so cross-user probes return 404, not existence hints.
2. **Database lock (RLS, `prisma/rls.sql`):** RLS enabled on all public tables with `auth.uid()` ownership policies. Prisma connects as table owner and is unaffected; RLS seals the PostgREST/Realtime doors so a leaked anon key exposes nothing. **Every new user-owned table needs a policy before shipping** (checklist item in doc 07).

## Secrets

- All server env through zod-validated `@/lib/env` — boot fails loudly on misconfiguration.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS: server-only, used for admin jobs/Storage, never imported into client bundles.
- Only `NEXT_PUBLIC_*` values may reach the browser; the anon key is safe by design *because* RLS is on.
- `.env*` is gitignored; `.env.example` carries structure, never secrets.

## Input & output hygiene

- Every API body through zod `safeParse`; URL inputs normalized via `extractDomain` (rejects malformed input).
- AI/scraped content is untrusted: rendered as text (no `dangerouslySetInnerHTML`), Telegram sends use plain text (no parse_mode injection), outbound fetches slice error bodies.
- `raw` JSON payloads on signals are stored, never executed or rendered as HTML.

## Collection ethics (also doc 09)

Public sources only; honor robots.txt and rate limits; identifiable user agent; no gated/private data; inferences labeled, never presented as fact.

## Jobs & webhooks

`/api/inngest` is signature-verified by the Inngest SDK (`INNGEST_SIGNING_KEY`) in production. Background jobs receive ids, not trusted payloads — they re-load rows via Prisma before acting.
