# 20 · Coding Standards

## TypeScript

- `strict` + `noUncheckedIndexedAccess`; no `any` (use `unknown` + narrowing); exported functions carry explicit return types where inference is non-obvious.
- Types co-located: feature types in the feature's `types.ts`; shared contracts in `src/lib/*/types.ts`.
- Zod at every trust boundary (API bodies, env, AI JSON output parsed defensively).

## Naming & files

- Files: kebab-case (`channel-card.tsx`, `send-digests.ts`). Components: PascalCase. Hooks: `use-*`. Services: `service.ts` per feature; engines get descriptive names (`intelligence.ts`, `scheduling.ts`, `digest.ts`).
- Prisma: PascalCase models, camelCase fields, snake_case `@@map` table names.
- Inngest: function ids kebab-case; events `noun/verb.state`.

## Architecture discipline (see doc 06 invariants)

- Routes thin; logic in feature services; heavy/scheduled work in Inngest functions.
- Pure logic (scheduling, scoring, matching) lives in dependency-free modules — unit-testable without mocks.
- No deep cross-feature imports; reuse before writing (check doc 17 first).
- New libraries require written justification against an existing capability.

## React

- Server components by default; `"use client"` only for interactivity.
- Data fetching in feature hooks via TanStack Query; mutations invalidate their query keys; user-facing errors normalized to `Error` with a readable message.
- Every screen: loading (Skeleton) / empty (EmptyState) / error states (doc 16).
- Styling: token classes only; cva for variants; `cn()` for merging.

## Comments & docs

- File-top doc comments state responsibility and constraints; inline comments only for what code can't say (invariants, gotchas, "why").
- JSDoc on exported services. Keep `/docs` synchronized — code change that alters documented behavior requires the doc change in the same task (rule file 00).

## Verification gates (every completed task)

```
npm run typecheck && npm run lint && npm run build
npx prisma validate && npm run db:generate   # when schema touched
```

All must pass — no exceptions, no "fix later".

## Git

Small, coherent commits in imperative mood. Never commit `.env`, generated clients, or `.next/`.
