# competitors

Competitor list + profile UI: threat scores, timelines, tech stack, funding, hiring, reviews, AI strategic summary.

## Convention

Each feature module owns its vertical slice:

```
competitors/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
