# 03 · Product Requirements Document

Status legend: ✅ shipped · 🔨 in progress · 📋 planned

## Features

| # | Feature | Priority | Status |
| --- | --- | --- | --- |
| F1 | Auth: email/password, Google, GitHub (Supabase Auth) | P0 | ✅ |
| F2 | One-URL onboarding → Company Understanding Engine | P0 | ✅ pipeline / 🔨 progress UX |
| F3 | Automatic competitor discovery with confidence scores; accept/reject/add | P0 | ✅ engine / 🔨 review UI |
| F4 | Baseline intelligence report (snapshot at onboarding) | P0 | 📋 |
| F5 | Continuous signal collection + Intelligence Layer enrichment | P0 | ✅ core / 🔨 monitors |
| F6 | Competitor list + full profiles (threat, tech, funding, hiring, reviews) | P0 | 📋 UI |
| F7 | Notification system: channels, HH:MM schedules, topics, quiet hours, smart digest | P0 | ✅ |
| F8 | AI ecosystem intelligence page (model releases, pricing, capabilities) | P1 | 📋 |
| F9 | Reports: daily/weekly/monthly/quarterly + PDF export | P1 | 📋 |
| F10 | Strategy chat grounded in collected intelligence | P1 | 📋 |
| F11 | Global intelligent search (⌘K) | P1 | 📋 |
| F12 | Decision Workspace — open strategic questions with evidence | P1 | 📋 |
| F13 | Decision Memory — recorded decisions, rationale, evidence, revisit loop | P1 | 🔨 |
| F14 | Threat/opportunity scoring with explainable breakdowns | P1 | ✅ scoring core |
| F15 | Landing page (YC-grade marketing site) | P1 | 📋 |
| F16 | Slack/Discord/WhatsApp/Push channels; embeddings search | P2 | 📋 |

## Hard product rules

1. Every feature must pass the manifesto's decision test (doc 01).
2. Raw events never reach the UI — Intelligence Layer output only (doc 09).
3. Trust tiers always visually distinct (docs 01, 16).
4. Never send an empty digest; never spam (doc 12).
5. Public, legal, ethical data sources only (doc 09).
6. Users can always edit what the AI concluded about their company (doc 04, J1).

## Success metrics (v1)

- Time from signup → populated dashboard: **< 90 seconds**.
- ≥ 70% of AI-discovered competitors accepted by users.
- Daily-open rate among active founders (the "morning habit" metric).
- ≥ 1 recorded decision per active workspace per month (Decision Memory adoption).

## Out of scope (v1)

Team/multi-seat workspaces, billing, mobile apps, light theme, public API, SOC 2 tooling.
