# 05 · Functional Requirements

Numbered requirements per module. Module → code mapping is in doc 06.

## FR-1 Onboarding & Company Understanding (`features/company-analysis`, `features/onboarding`)
- FR-1.1 The only required input is a company URL; normalize to a domain (`extractDomain`).
- FR-1.2 The Understanding Engine extracts: name, industry, description, business model, target audience, features, keywords, technologies.
- FR-1.3 Analysis runs as a durable background pipeline (Inngest) with status: PENDING → ANALYZING → COMPLETE/FAILED.
- FR-1.4 The user can edit every extracted field afterwards.

## FR-2 Competitor Discovery (`features/competitor-discovery`)
- FR-2.1 Competitors are discovered automatically; the user never has to search.
- FR-2.2 Every discovered competitor carries a 0–1 confidence/similarity score and a reason.
- FR-2.3 Discovered competitors enter status SUGGESTED; user moves them to TRACKING or DISMISSED; manual adds allowed.
- FR-2.4 Max 10 per discovery round; only real, operating companies.

## FR-3 Signals (`features/signals`)
- FR-3.1 `recordSignal()` is the only write path to the signal stream.
- FR-3.2 Every signal has category, severity (INFO/NOTABLE/IMPORTANT/CRITICAL), optional topic key, and provenance (`isInference` + confidence).
- FR-3.3 Monitors must call `enrichSignal()` first: every stored signal carries `whyItMatters` and `recommendation`.
- FR-3.4 IMPORTANT/CRITICAL signals emit `signal/recorded` for instant-alert delivery.

## FR-4 Scoring (`features/scoring`)
- FR-4.1 Threat score 0–100 from weighted factors; weights centralized in `THREAT_WEIGHTS`.
- FR-4.2 Every score persists its full per-factor breakdown (ScoreSnapshot) for explainability and trends.

## FR-5 Notifications (`features/notifications`) — see doc 12 for full spec
- FR-5.1 Channels: Email + Telegram (MVP); multiple simultaneous channels per user.
- FR-5.2 HH:MM delivery precision in the user's IANA timezone; DST via `Intl`, never offset math.
- FR-5.3 Frequencies: DAILY, WEEKDAYS, WEEKLY (day pick), MONTHLY (day 1–28), INSTANT_ONLY.
- FR-5.4 Per-channel topic subscriptions (empty = all) and minimum priority.
- FR-5.5 Quiet hours (may wrap midnight), weekend pause, vacation, snooze; CRITICAL override is opt-in.
- FR-5.6 Digests group related events and end with an AI strategic summary; empty digests are never sent.
- FR-5.7 Every delivery attempt is logged (NotificationLog) with status and error.

## FR-6 Reports (`features/reports`) — see doc 11
- FR-6.1 Types: DAILY, WEEKLY, MONTHLY, QUARTERLY + the onboarding baseline snapshot.
- FR-6.2 Every report answers: what happened, what changed, why it matters, what to do.
- FR-6.3 PDF export stored in Supabase Storage (`Report.pdfPath`).

## FR-7 Chat (`features/chat`) — see doc 13
- FR-7.1 Answers grounded in the user's signals, insights, competitor profiles, and Decision Memory; citations required.
- FR-7.2 Streaming responses via `ai.stream({ task: "chat" })`.

## FR-8 Search (`features/search`) — see doc 13
- FR-8.1 Global ⌘K palette searching competitors, signals, tech, reports, decisions.
- FR-8.2 MVP: Postgres full-text; embeddings later.

## FR-9 Decision Workspace & Memory (`features/decisions`) — see docs 14–15
- FR-9.1 A decision records: question/title, context, options considered, choice, rationale, evidence refs, status, outcome, revisit date.
- FR-9.2 Lifecycle: CONSIDERING → DECIDED → (REVISIT | REVERSED); outcome: PENDING → VALIDATED/MIXED/REGRETTED.
- FR-9.3 Evidence references signals/insights by id (`evidence` JSON), validated as belonging to the same user at write time.
- FR-9.4 Chat and reports must consult Decision Memory when relevant.

## FR-10 Cross-cutting
- FR-10.1 All server auth via `getSessionUser()`; every query user-scoped (doc 19).
- FR-10.2 All AI calls via `ai.complete({ task })`; model names only in the routing table (doc 08).
- FR-10.3 Every list/detail screen implements loading, empty, and error states (doc 16).
