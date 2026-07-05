# search

Global intelligent search (Cmd+K): competitors, signals, tech, reports. Postgres FTS first, embeddings later.

## Convention

Each feature module owns its vertical slice:

```
search/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
