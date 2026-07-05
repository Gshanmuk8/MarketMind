# reports

Generates daily/weekly/monthly/quarterly reports: executive summary, SWOT, landscape, threat analysis, recommended actions. PDF export.

## Convention

Each feature module owns its vertical slice:

```
reports/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
