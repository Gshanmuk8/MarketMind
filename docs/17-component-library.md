# 17 · Component Library

Check here before building anything — duplicating an existing component violates the development rules.

## Primitives (`src/components/ui/`)

| Component | Variants / notes |
| --- | --- |
| `Button` | `primary` (ink fill, ivory text) · `secondary` (hairline outline) · `ghost` · `danger` (clay); sizes sm/md/lg; cva-based; subtle `radius-sm` corners, no glows |
| `Card` (+ Header/Title/Description) | porcelain panel with hairline border; `plain` styling via className when a section should be rule-separated instead of boxed |
| `Badge` | `default` · `accent` · `live` · `score` · `warning` · `critical` · **`inference`** (trust tier 2 — mandatory for AI conclusions); mono uppercase microtype |
| `Input` | text/email/password/time/number; underline-on-ivory or boxed-on-porcelain; accent focus ring |
| `Skeleton` | linen pulse placeholder for loading states |

## Layout (`src/components/layout/`)

`IndexNav` (fixed left contents column — Fraunces wordmark, numbered nav entries from `config/navigation.ts`; add nav items THERE, not in the component) · `FolioBar` (thin top line: current section, date, ⌘K search affordance, notifications, account from Supabase user).

## Shared (`src/components/shared/`)

`PageHeader` (microlabel eyebrow + Fraunces title + description/actions, closed by a hairline rule — every app page starts with it) · `EmptyState` (microlabel, title, guidance, action — set like a colophon page; every empty screen uses it).

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
