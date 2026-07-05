# seo-intel

Tracks keywords, landing pages, ranking movements, and ads. Writes SEO signals.

## Convention

Each feature module owns its vertical slice:

```
seo-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
