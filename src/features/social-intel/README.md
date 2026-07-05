# social-intel

Monitors X/Twitter, LinkedIn, Reddit, Hacker News, Product Hunt for launches, virality, and sentiment. Writes SOCIAL and MARKETING signals.

## Convention

Each feature module owns its vertical slice:

```
social-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
