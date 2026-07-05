# technology-intel

Detects and tracks competitor tech stacks (frameworks, databases, cloud, DevOps) from public signals: HTML fingerprints, job postings, GitHub, docs. Writes TechStackEntry rows + TECHNOLOGY signals.

## Convention

Each feature module owns its vertical slice:

```
technology-intel/
├── components/   # UI for this feature only
├── hooks/        # client hooks (React Query)
├── service.ts    # server-side business logic
└── types.ts      # feature-local types
```

Cross-feature imports go through `@/lib` or the other feature's public exports — never deep paths.
