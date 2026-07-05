# 11 · Report Generation Engine

Status: 📋 planned (schema shipped: `Report`).

## Purpose

Structured intelligence instead of newsletters. Every report answers four questions: **What happened? What changed? Why does it matter? What should I do?**

## Report types

| Type | Trigger | Emphasis |
| --- | --- | --- |
| Baseline | onboarding completion | snapshot of the landscape, not a change report |
| DAILY | cron | what moved in the last 24h |
| WEEKLY | cron | strategic report: SWOT, threats, recommended actions |
| MONTHLY | cron | market report: trends, trajectory shifts |
| QUARTERLY | cron | competitive review: position, gaps, strategy check |

## Structure (stored as `Report.content` JSON sections)

Executive summary (also denormalized to `executiveSummary`) · competitive landscape · market/technology changes · threat analysis (with score deltas) · customer sentiment · SWOT · opportunities & gaps · **recommended actions with priority scores** · appendix: signals cited.

## Generation pipeline (Inngest, planned `generate-report`)

1. Gather period data via Prisma: signals in window, score snapshots, insights, tech changes, AI ecosystem updates, open/decided Decisions.
2. Per-section generation via `ai.complete({ task: "strategy" | "summarization" })` — grounded strictly in gathered rows; each section carries citations (signal/insight ids).
3. Assemble + persist `Report`; render PDF; upload to Supabase Storage bucket `reports`; store `pdfPath`.
4. Notify per user channel preferences (doc 12).

## Rules

- Reports respect trust tiers: facts cited with sources, inferences labeled, recommendations marked as recommendations.
- Reports must consult Decision Memory: flag when period evidence supports or contradicts a recorded decision (doc 15).
- A report with no meaningful period activity says so briefly — never pad.
- Priority scores on recommended actions are explainable (impact × confidence rationale in the JSON).
