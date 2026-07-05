# 07 · Database Design

Authoritative schema: `prisma/schema.prisma`. This document explains the design; when they diverge, fix one — never let them drift.

## Conventions

- IDs: `cuid()` strings, except `Profile.id` (UUID = Supabase `auth.users.id`).
- Table names mapped to snake_case via `@@map`; columns stay camelCase.
- Timestamps: `createdAt @default(now())` + `updatedAt @updatedAt` on mutable tables.
- Deletes cascade down ownership chains; `SetNull` only where history must survive (e.g. `Insight.competitorId`).
- Every user-owned table carries `userId @db.Uuid` directly or reaches one through its parent chain — this is what makes RLS possible (doc 19).

## Entity map

```
Profile (auth mirror)
└── Company (the user's product)          ── @@unique([userId, domain])
    ├── Competitor                        ── @@unique([companyId, domain])
    │   ├── TechStackEntry                ── @@unique([competitorId, name])
    │   └── ScoreSnapshot                 ── explainable threat history
    ├── Signal                            ── the unified event stream
    ├── Insight                           ── AI conclusions (SWOT/gap/opportunity/strategy)
    ├── Report
    └── Decision                          ── Decision Memory (doc 15)
Profile
├── ChatThread ── ChatMessage
├── NotificationChannel ── NotificationLog
└── NotificationSettings (1:1)
AiProviderUpdate                          ── shared, user-independent reference data
```

## Design decisions

1. **Signals are one table.** Every observation shares category/severity/topic/provenance columns; monitors differ, storage doesn't. This enables the unified feed, digests, and reports without joins across N event tables.
2. **Provenance is a column, not a convention.** `isInference` + `confidence` on Signal and TechStackEntry.
3. **Intelligence Layer fields live on the Signal** (`whyItMatters`, `recommendation`) — enrichment happens before write, so reads never wait on AI.
4. **Scores are snapshots.** `ScoreSnapshot.breakdown` (JSON) stores per-factor contributions; `Competitor.threatScore` is a denormalized copy of the latest.
5. **Decision evidence is a JSON ref list** (`Decision.evidence: [{type: "signal"|"insight", id}]`), not m-n join tables — keeps RLS surface minimal (no policy-bearing join tables) and evidence flexible. Services must validate referenced ids belong to the same user's company at write time.
6. **Notification schedule is per channel; delivery rules are per user.** A user can run email daily 08:00 + Telegram instant criticals simultaneously (doc 12).

## Enums (do not extend casually — UI and jobs switch on these)

`AnalysisStatus`, `CompetitorStatus`, `SignalCategory` (13 values), `SignalSeverity`, `TechCategory`, `AiUpdateKind`, `InsightType`, `ImpactLevel`, `ReportType`, `ChatRole`, `ChannelType`, `DigestFrequency`, `DeliveryStatus`, `DecisionStatus`, `DecisionOutcome`.

## Migrations

Dev: `npm run db:push`. Tracked: `npm run db:migrate` (uses `DIRECT_URL`). After any schema change: `npm run db:generate`, and re-check `prisma/rls.sql` — new user-owned tables need policies before shipping.
