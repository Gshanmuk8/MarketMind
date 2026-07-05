# dashboard

Command-center widgets: intelligence score, threat meter, signal feed, market overview.

## Convention

Each feature module owns its vertical slice:

```
dashboard/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
