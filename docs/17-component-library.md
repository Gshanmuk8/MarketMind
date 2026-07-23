# 17 · Component Library

Check here before building anything — duplicating an existing component violates the development rules.

Design language: **Vellum** (see doc 16) — light museum-editorial, graphite ink on porcelain, botanical/mineral accents, **no gradients, glass, or glow**. Motion is out **except one sanctioned exception: the loading spinner** — the single moving mark, reserved for "working…". It stills itself under `prefers-reduced-motion` (owner decision, 2026-07: every in-flight action must show a loading mark).

## Primitives (`src/components/ui/`)

| Component | Variants / notes |
| --- | --- |
| `Button` | `primary` (ink block, paper-coloured type) · `secondary` (hairline outline) · `ghost` · `danger` (restrained brick outline); sizes sm/md/lg; cva-based; square, no glow/gradient. **`loading` prop** shows a leading `Spinner` and disables the button — pass it for every mutation (target the exact row via `mutation.variables` when one hook drives several buttons) |
| `Spinner` | the one loading mark (lucide `Loader2`, `animate-spin`); inherits `currentColor`; `motion-reduce:animate-none`. Use inline (buttons, search field, chat "thinking") wherever an action is in flight |
| `Card` (+ Header/Title/Description) | porcelain plate with a fine hairline; prefer rule-separated sections over boxes where a plate isn't needed |
| `Badge` | `default` · `accent` · `live` · `score` · `warning` · `critical` · **`inference`** (trust tier 2 — mandatory for AI conclusions); quiet mono microtype, hairline tint (no glow) |
| `Input` | text/email/password/time/number; porcelain field, hairline, sage focus ring |
| `Skeleton` | still limestone block — no pulse, no shimmer (motion is out) |

## Layout (`src/components/layout/`)

`IndexNav` (fixed left contents column — display wordmark, numbered nav entries from `config/navigation.ts`; add nav items THERE, not in the component) · `FolioBar` (thin top folio line: current section, date, ⌘K search affordance, account from Supabase user).

## Shared (`src/components/shared/`)

`PageHeader` (microlabel eyebrow + display title + description/actions, closed by a hairline) · `EmptyState` (microlabel, title, guidance, action — composed like an art-book opening plate; every empty screen uses it) · `PageLoading` (centered `Spinner` + label; rendered by each route's `loading.tsx` so **every** navigation shows a loader while the server component streams).

Loading states are mandatory everywhere: route transitions use a `loading.tsx` → `PageLoading`; data queries use `Skeleton` (or `PageLoading`) while pending; mutations use `Button`'s `loading` prop or an inline `Spinner`.

## Providers (`src/components/providers.tsx`)

TanStack Query client (staleTime 30s, retry 1). Future global providers (toasts, command palette) register here.

## Feature components

Live inside their feature (`features/<name>/components/`), e.g. `notifications/channel-card`, `notifications/notification-settings`, `onboarding/onboarding-form`. A feature component used by 2+ features graduates to `components/shared/` (move it, don't copy it).

## Conventions

- Client components only when interactivity requires it; pages stay server components.
- Data access in components goes through feature hooks (React Query) — never raw `fetch` in JSX files (hooks own the fetch + error normalization).
- Selects/checkboxes use native elements styled with tokens until a dedicated primitive is added.
- Icons: lucide-react, `strokeWidth={1.5}` (hairline weight), size-4 default. Icons are annotations, not decoration — prefer numerals and rules.

## Planned primitives

Dialog/Sheet, Toast, Tabs, Table (data-dense), CommandPalette (cmdk), Chart wrappers (Recharts + dataviz tokens), TimePicker refinement, ScoreMeter (threat/opportunity dials).
