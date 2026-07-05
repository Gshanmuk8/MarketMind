# Supabase Setup

The backend standard: **Next.js → Prisma ORM → Supabase PostgreSQL**. Application code never queries Postgres or `supabase.from()` directly — Prisma is the only data path. Supabase provides Postgres, Auth, and Storage.

## 1. Create the project

1. [supabase.com](https://supabase.com) → New project.
2. Project Settings → Database → copy the **Transaction pooler** URI into `DATABASE_URL` (append `?pgbouncer=true`) and the **Session/direct** URI into `DIRECT_URL`.
3. Project Settings → API → copy the URL and anon key into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; copy the service role key into `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS — never expose).

## 2. Push the schema

```bash
npm run db:push       # dev sync
# or, for tracked migrations:
npm run db:migrate    # uses DIRECT_URL
npm run db:generate
```

## 3. Enable Row Level Security

Open the Supabase SQL editor and run **`prisma/rls.sql`**.

Prisma connects as the table owner, so app queries are unaffected; RLS locks down the PostgREST/Realtime doors so a leaked anon key can access nothing. In-app authorization is enforced by user-scoped Prisma queries via `getSessionUser()` — both layers must hold.

## 4. Auth providers

Authentication → Providers:

- **Email** — enabled by default (confirmations optional; the signup screen handles both modes).
- **Google** and **GitHub** — add OAuth credentials from their consoles. Set the callback to `https://<project-ref>.supabase.co/auth/v1/callback`, and add `http://localhost:3000/auth/callback` (plus the production equivalent) to Authentication → URL Configuration → Redirect URLs.

## 5. Storage buckets (future assets)

Create private buckets as features land — access via the server client with the service role key, never public:

| Bucket | Contents |
| --- | --- |
| `logos` | company/competitor logos |
| `reports` | exported PDF reports (`Report.pdfPath`) |
| `avatars` | user avatars |

## Auth architecture

- `src/lib/supabase/server.ts` / `client.ts` — Supabase clients, **auth only**.
- `src/lib/session.ts` — `getSessionUser()`: verifies the JWT (`auth.getUser()`), lazily mirrors the user into `public.profiles` so Prisma relations resolve, and is the single auth entry point for all server code.
- `src/middleware.ts` — refreshes tokens and gates all app routes.
- `src/app/auth/callback/route.ts` — OAuth code exchange.
