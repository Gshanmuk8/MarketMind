# 15 · Decision Memory

Status: 🔨 shipping (schema + service + API + UI slice).

## Purpose

A founder's strategic decisions are their most valuable, least-recorded data. Decision Memory makes MarketMind AI the only tool that remembers **what was decided, why, based on what evidence, what was rejected — and whether the market later proved it right**. This is the moat: intelligence platforms show the market; MarketMind remembers your position in it.

## Data model (`Decision`, owned via Company)

| Field | Meaning |
| --- | --- |
| `title` | the question/decision, imperative and searchable |
| `context` | situation at decision time — written for the future reader |
| `choice` | what was decided (null while CONSIDERING) |
| `rationale` | why — the argument that won |
| `alternatives` | JSON `[{ option, reason }]` — what was rejected and why |
| `evidence` | JSON `[{ type: "signal"\|"insight", id }]` — grounding refs, ownership-validated |
| `status` | CONSIDERING → DECIDED → REVISIT \| REVERSED |
| `outcome` | PENDING → VALIDATED \| MIXED \| REGRETTED (+ `outcomeNotes`) |
| `decidedAt`, `revisitAt` | when decided; when to re-evaluate |

## Lifecycle

```
CONSIDERING ──decide──> DECIDED ──revisitAt reached / contradicting evidence──> REVISIT
                          │                                                      │
                          └────────────── user reverses ──> REVERSED <───────────┘
Outcome (on DECIDED/REVERSED): PENDING → VALIDATED / MIXED / REGRETTED
```

## The revisit loop (job `decision-revisit`, daily cron — shipped)

`jobs/functions/decision-revisit.ts` → `features/decisions/revisit.ts`, daily at 05:00 UTC, per COMPLETE company:

1. **Scheduled revisit** — decisions with `revisitAt <= now` and status DECIDED are flagged REVISIT (idempotent), and a market-wide `STRATEGY` Insight is created ("You planned to re-evaluate this").
2. **Contradicting evidence** — recent IMPORTANT/CRITICAL signals are checked by the AI (`task: "strategy"`) against each DECIDED decision's rationale. When the market has moved **against** a decision, it is flagged REVISIT and an Insight is created that names the offending signal ("You bet against voice in March; competitor X just shipped it"). The Insight links `competitorId` when the signal names one.

The AI only *recommends* the revisit — it flags status REVISIT and writes an Insight, never reversing or re-deciding. The founder still owns DECIDED/REVERSED/outcome transitions. Each contradiction is recorded once (dedupe by decision + signal in the Insight `data`), so re-runs don't nag.

## How the AI uses Decision Memory

- **Chat** retrieves relevant decisions: "You considered voice in March and chose meal-planning because retention data favored it. Since then, 2 competitors shipped voice."
- **Reports** (doc 11) flag when period evidence supports or contradicts recorded decisions.
- **Enrichment context** (later): `enrichSignal` may receive active decisions so `whyItMatters` can reference them.

## Rules

- The AI never changes a decision's status or outcome — only the founder does. The AI recommends and reminds.
- Evidence refs must belong to the same user's company; the service validates at write time (doc 07, design decision 5).
- Decision content follows trust tiers: evidence chips show provenance; AI briefs are labeled recommendations.

## API + UI

Routes: `GET/POST /api/decisions`, `PATCH/DELETE /api/decisions/[id]` (doc 18). UI: `/decisions` — see doc 14.
