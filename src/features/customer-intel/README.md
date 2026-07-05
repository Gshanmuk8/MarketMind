# customer-intel

Aggregates reviews (G2, Capterra, Trustpilot, app stores) and community feedback; AI summarizes loves/hates/most-requested. Writes CUSTOMER signals.

## Convention

Each feature module owns its vertical slice:

```
customer-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
