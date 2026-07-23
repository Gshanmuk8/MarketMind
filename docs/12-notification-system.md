# 12 · Notification System

Status: 🔨 shipping. **Report delivery ("Monday Morning Memo") is live**; the per-minute digest scheduler and instant alerts remain planned (see Roadmap below). Code: `features/notifications/`.

## Principles

Users have complete control over **when, how, and what** they receive. The system behaves like a personal intelligence assistant, never a newsletter: grouped content, no empty sends, no spam.

## Model (schema is complete; code fills in progressively)

- **NotificationChannel** (per destination, several per user): type (EMAIL, TELEGRAM shipped; SLACK/DISCORD/WHATSAPP/PUSH reserved), config (`{email}` / `{chatId}`), `enabled`, frequency (DAILY / WEEKDAYS / WEEKLY+day / MONTHLY+day / INSTANT_ONLY), `deliveryTime`, minimum priority, topic subscriptions (empty = all), `instantAlerts`, `lastDigestAt` watermark.
- **NotificationSettings** (per user): IANA timezone, quiet hours, critical-overrides-quiet, weekend pause, vacation/snooze. (Consumed by the planned scheduler.)
- **NotificationLog**: every delivery attempt (QUEUED → SENT/FAILED + error).

## Delivery adapters (`delivery/`)

One file per channel type implementing `DeliveryAdapter { type, isConfigured(), send(config, message) }`. Shipped: **email** (Resend REST, `EMAIL_FROM` sender) and **telegram** (Bot API `sendMessage`, HTML). Adding Slack/Discord/WhatsApp is a new adapter + registry line, never a refactor. `send()` throws on failure so callers can log FAILED and (in jobs) retry.

## Report delivery — the Monday Morning Memo (shipped)

When `generate-reports` writes a weekly Report, it delivers it to every **enabled** channel of the owning user whose frequency isn't `INSTANT_ONLY`:

- `features/notifications/render.ts` → `renderReportMessage(report, company)` builds subject + plaintext + HTML from the executive summary, top recommended actions, and a deep link to `/reports/[id]` (absolute via `NEXT_PUBLIC_APP_URL`).
- `service.deliverReport(reportId)` loads the report + owning user's channels, sends through each adapter, and writes a `NotificationLog` per attempt. Per-channel failures are isolated and logged, never fatal to report generation.
- Delivery runs in its own Inngest step (memoized), so a job retry never re-sends an already-delivered memo.

Intelligence nobody opens is intelligence that doesn't exist — the memo is how the weekly report reaches the founder without them signing in.

## Channel management

`GET/POST /api/notifications` (list / create), `PATCH/DELETE /api/notifications/[id]` (toggle `enabled`, update config, delete). UI lives in Settings: add an email channel (prefilled with the account email) or a Telegram channel (chat-id, with connect instructions), toggle, and remove.

## Topic taxonomy

Namespaced stable keys in `features/notifications/types.ts`: `competitor.*`, `tech.*`, `engineering.*`, `hiring.*`, `customer.*`, `pricing.*`. Monitors set `Signal.topic`; topic-less signals match via their category's group.

## Roadmap (planned, not yet shipped)

- **`send-digests` cron (per-minute)** — timezone/`deliveryTime` scheduling via `Intl.DateTimeFormat` (never UTC-offset arithmetic), quiet hours for instant alerts, watermark advance only after successful delivery, empty digests skipped.
- **`instant-alerts` on `signal/recorded`** — IMPORTANT/CRITICAL events delivered immediately to opted-in channels, respecting quiet hours (CRITICAL may pierce when opted in).
- **Smart Digest (`digest.ts`)** — signals grouped by category with provenance marks and an AI strategic summary.
