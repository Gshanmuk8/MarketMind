# 17 · Component Library

Check here before building anything — duplicating an existing component violates the development rules.

Design language: **Vellum** (see doc 16) — light museum-editorial, graphite ink on porcelain, botanical/mineral accents, **no gradients, glass, glow, or motion**.

## Primitives (`src/components/ui/`)

| Component | Variants / notes |
| --- | --- |
| `Button` | `primary` (ink block, paper-coloured type) · `secondary` (hairline outline) · `ghost` · `danger` (restrained brick outline); sizes sm/md/lg; cva-based; square, no glow/gradient |
| `Card` (+ Header/Title/Description) | porcelain plate with a fine hairline; prefer rule-separated sections over boxes where a plate isn't needed |
| `Badge` | `default` · `accent` · `live` · `score` · `warning` · `critical` · **`inference`** (trust tier 2 — mandatory for AI conclusions); quiet mono microtype, hairline tint (no glow) |
| `Input` | text/email/password/time/number; porcelain field, hairline, sage focus ring |
| `Skeleton` | still limestone block — no pulse, no shimmer (motion is out) |

## Layout (`src/components/layout/`)

`IndexNav` (fixed left contents column — display wordmark, numbered nav entries from `config/navigation.ts`; add nav items THERE, not in the component) · `FolioBar` (thin top folio line: current section, date, ⌘K search affordance, account from Supabase user).

## Shared (`src/components/shared/`)

`PageHeader` (microlabel eyebrow + display title + description/actions, closed by a hairline) · `EmptyState` (microlabel, title, guidance, action — composed like an art-book opening plate; every empty screen uses it).

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
