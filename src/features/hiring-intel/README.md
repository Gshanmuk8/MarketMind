# hiring-intel

Monitors public job postings per competitor; classifies roles (AI, backend, ML, security) and infers strategy shifts. Writes HIRING signals (isInference=true for conclusions).

## Convention

Each feature module owns its vertical slice:

```
hiring-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
