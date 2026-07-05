# 14 · Decision Workspace

Status: 🔨 first slice ships with Decision Memory (doc 15); AI briefs planned.

## Purpose

The manifesto's test is "does this help the founder decide?" The Decision Workspace is where deciding actually happens. Intelligence (signals, insights, reports) flows **into** open questions; resolved questions flow **out** as recorded decisions in Decision Memory.

## The unit of work: an open decision

A `Decision` in status **CONSIDERING** is an open strategic question:

- **Title** — the question ("Should we build voice coaching?").
- **Context** — the situation prompting it, at the time it was raised.
- **Options** — candidate answers, each with its own rationale (stored in `alternatives`).
- **Evidence** — attached signals and insights (`evidence` JSON refs; service-validated ownership).

## Where decisions come from

1. Manually: the founder opens the workspace and frames a question.
2. From intelligence: any signal/insight/report recommendation offers "Consider this →" which pre-fills a decision with that item attached as evidence.
3. From chat: "should we…?" conversations offer to save the question as an open decision.

## The AI decision brief (planned)

For an open decision, `task: "strategy"` generates a brief grounded ONLY in attached + relevant retrieved evidence: the case for each option, risks, what competitors are doing, and a recommendation — labeled as a recommendation (trust tiers, doc 01). The founder decides; the AI never auto-decides.

## Resolving

Choosing an option records: `choice`, `rationale`, rejected `alternatives`, `decidedAt`, optional `revisitAt` → status **DECIDED**. From that moment it belongs to Decision Memory (doc 15).

## UI (v1 slice)

`/decisions` page: open questions first (CONSIDERING), then the memory log. Create-question form (title + context). Status transitions inline. Evidence chips link back to the underlying signals/insights.
