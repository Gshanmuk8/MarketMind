# insights — Strategy Engine

Turns the dossier (company understanding + discovered competitors + observed signals) into strategic **Insights**: opportunities, gaps, SWOT reads, and recommendations. Insights are AI inferences by definition (the `Insight` model) and answer the manifesto test — *what to build, ignore, or do next*.

- `service.ts` → `generateCompanyInsights(companyId)` — one `ai.complete({ task: "strategy" })` call over the top competitors + recent signals; validates against the `InsightType` / `ImpactLevel` enums, resolves free-text competitor references to real ids, and persists. **Idempotent**: replaces the previous non-dismissed set on each run (dismissed insights the founder actioned are kept), so re-analysis refreshes the assessment instead of duplicating it.

## Consumed by

- **Competitor dossier** (`app/(app)/competitors/[id]`) — competitor-linked insights render as the lead assessment + "Strategic assessment" section.
- **Decision workspace** (`features/decisions`) — insights are the raw material a founder promotes into decisions.

## Produced by

- `jobs/functions/analyze-company.ts` — the `generate-insights` step, after competitor discovery + baseline threat scoring. Non-fatal: discovery is the critical path, insights are additive.

Regenerate for a company by re-running its analysis (`PATCH /api/companies/:id { action: "reanalyze" }`).
