# 18 · API Specification

## Conventions

- Route handlers under `src/app/api/` are thin: parse (zod `safeParse`) → authorize (`getSessionUser()`) → delegate to a feature service → `NextResponse.json`.
- Auth: session cookie (Supabase). Unauthenticated → `401 { "error": "Unauthorized" }`.
- Validation failure → `400 { "error": <message | zod flatten> }`. Missing/foreign resource → `404`. Never leak whether a resource exists for another user (ownership checks use scoped `updateMany`/`deleteMany` + count).
- Success: `200` (or `201` on create) with a named top-level key (`{ company }`, `{ channels }`), never bare arrays.
- Mutations of user data must scope every query by `userId` (or parent chain) — RLS is the second lock, not the first (doc 19).

## Shipped routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/health` | GET | liveness |
| `/api/companies` | GET, POST | list; create + emit `company/analyze.requested` |
| `/api/decisions` | GET, POST | list decisions; create (CONSIDERING) |
| `/api/decisions/[id]` | PATCH, DELETE | decide/status/outcome transitions; remove |
| `/api/competitors` | GET | the user's landscape (non-dismissed, threat-ranked) |
| `/api/competitors/[id]` | PATCH | curate status (TRACKING/DISMISSED/SUGGESTED); tracking emits `monitor/tick` |
| `/api/companies/[id]` | PATCH, DELETE | `{action:"reanalyze"}` re-queues the pipeline; `{url}` switches the website (clears derived intelligence, keeps decisions, re-analyzes); delete removes company + derived data |
| `/api/reports` | GET, POST | archive; POST queues `report/generate` for the user's company |
| `/api/chat` | GET, POST | default-thread messages; POST asks the grounded strategist (citations in `sources`) |
| `/api/search` | GET `?q=` | palette search over competitors/signals/decisions/reports |
| `/api/inngest` | GET, POST, PUT | Inngest serve endpoint |
| `/auth/callback` | GET | OAuth code exchange (not under /api by Supabase convention) |

Notification/mail delivery was removed by owner decision (2026-07) — no digest/alert routes or jobs exist. The AI Intelligence page was merged into Technology (one frontier feed).

## Planned routes

`/api/signals` (feed, filters) · report PDF export · multi-thread chat with streaming · Postgres full-text search upgrade.

## Events (Inngest contract, `src/jobs/client.ts`)

| Event | Payload | Consumer |
| --- | --- | --- |
| `company/analyze.requested` | `{ companyId }` | analyze-company |
| `monitor/tick` | `{}` (also cron `0 */6 * * *`) | run-monitors — sweep TRACKING competitors: website diff + GitHub releases → `enrichSignal()` → `recordSignal()` → threat re-assessment |
| `ecosystem/sweep.requested` | `{}` (also cron `15 */6 * * *`) | ecosystem-sweep — tech/AI/research feeds (HN, arXiv, OpenAI, Google AI, HF), AI-filtered per company into market-wide signals |
| `report/generate` | `{ companyId?, type? }` (also cron `0 6 * * 1`) | generate-reports — grounded periodic reports; empty periods skipped |
| reserved | `competitor/discover.requested` | future |

Adding an event: name it `noun/verb.state`, register the constant in `Events`, document it here.
