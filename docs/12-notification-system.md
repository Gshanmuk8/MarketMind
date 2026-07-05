# 12 · Notification System

Status: ✅ shipped. Code: `features/notifications/`, jobs `send-digests` + `instant-alerts`.

## Principles

Users have complete control over **when, how, and what** they receive. The system behaves like a personal intelligence assistant, never a newsletter: grouped digests, no empty sends, no spam.

## Model

- **NotificationChannel** (per destination, several per user): type (EMAIL, TELEGRAM shipped; SLACK/DISCORD/WHATSAPP/PUSH reserved), config (`{email}` / `{chatId}`), frequency (DAILY / WEEKDAYS / WEEKLY+day / MONTHLY+day / INSTANT_ONLY), `deliveryTime` "HH:MM" minute precision, minimum priority, topic subscriptions (empty = all), `instantAlerts` flag, `lastDigestAt` watermark.
- **NotificationSettings** (per user): IANA timezone, quiet hours (may wrap midnight), critical-overrides-quiet opt-in, weekend pause, vacation until, snooze until.

## Scheduling semantics (`scheduling.ts` — pure, unit-testable)

- Wall-clock time comes from `Intl.DateTimeFormat` in the user's timezone — DST is handled implicitly; **never** do UTC-offset arithmetic.
- A digest fires when the channel's frequency matches today AND `deliveryTime` equals the current wall-clock minute.
- Quiet hours apply to **instant alerts** (digests are exempt — the user chose their time explicitly); pauses (vacation/snooze/weekend) apply to everything.
- CRITICAL may pierce quiet hours only when the user opted in.

## Delivery pipeline

- `send-digests` cron runs **every minute** (HH:MM precision requires it): find due channels → collect signals since watermark → filter by priority + topics → `buildDigest()` → adapter send → **advance watermark only after successful delivery** (so a failed send retries against the same signal window; the empty case advances immediately so stale items can't flood a later digest) → log.
- `instant-alerts` on `signal/recorded`: per opted-in channel, apply threshold/topics/quiet rules → send → log.
- Adapters implement `DeliveryAdapter` (`delivery/`): one file per channel type; adding Slack/Discord/WhatsApp is a new adapter + registry line, never a refactor.
- Every attempt writes `NotificationLog` (QUEUED → SENT/FAILED + error). Failed sends throw so Inngest retries.

## Smart Digest (`digest.ts`)

Groups signals by category (top 5 shown per group, severity-first), marks provenance (`[AI inference]`), surfaces `whyItMatters`, and closes with an **AI Strategic Summary** — 2–4 sentences naming the most important market movement and one concrete action (`task: "strategy"`; stub text on AI failure). Subject line carries signal counts. Empty digests are never sent.

## Topic taxonomy

Namespaced stable keys in `features/notifications/types.ts` across five groups: competitor.\*, tech.\* (per AI provider), engineering.\*, hiring.\*, customer.\*. Monitors set `Signal.topic`; topic-less signals match via their category's group.
