# 16 · UI/UX Design System — "Atelier"

Tokens live in `src/app/globals.css` `@theme`. Components use token classes only — raw hex in a component is a defect.

## Concept

MarketMind AI is set like a **privately printed intelligence briefing**: warm paper, ink typography, hairline rules, museum spacing. The philosophy is Rams/Muji/Swiss-editorial — engineered rather than decorated, quiet rather than loud. Nothing glows, nothing floats on glass, nothing looks like a dashboard template. Intelligence is communicated through restraint.

## Theme

**Light only** (owner decision, 2026-07 — supersedes the former dark-only rule). Paper depth scale — "Pressroom": `background` #F3F3EF (gallery white) → `surface` #FFFFFF (paper panels) → `surface-raised` (stone hover) → `surface-overlay` (white, modals). Rules: `border` (light) / `border-strong` (TRUE INK #101010 — strong rules are ink, not gray). Text selection is pale vermilion. Shadows nearly invisible, overlays only.

## Color is information, not decoration

"Pressroom" palette (owner recolor, 2026-07): true ink on gallery white with ONE loud signature — vermilion. High-contrast, print-shop confidence; supporting hues are quiet specialists. Nothing pastel, nothing SaaS.

| Token | Hue | Meaning — use for nothing else |
| --- | --- | --- |
| `foreground` | true ink (#101010) | primary text |
| `accent` | vermilion | primary actions, positive state — the red dot |
| `live` | deep teal | live data, links |
| `inference` | zinc | **AI inference** markers (trust tier 2) |
| `score` | cobalt | scores (also the ledger rules on key figures) |
| `warning` | dark amber | warnings only |
| `critical` | crimson | critical alerts only |
| `muted` / `faint` | graphite / stone | secondary / tertiary text |

Color appears in hairline accents, small marks, and type — never in floods. Banned: gradients as decoration, glassmorphism, neumorphism, glows.

## Typography — the identity

- **Display: Kawoszeh** (`font-display`, via `@font-face` from `public/fonts/Kawoszeh.ttf`; guaranteed fallback: Marcellus) — for page titles, numerals of consequence, and the wordmark. Large, unhurried.
- **Body/UI: Inter** (`font-sans`) — quiet, precise.
- **Data: JetBrains Mono** (`.font-data`, tabular) — every score, count, time, ID.
- **Microlabels** (`.microlabel`): mono, uppercase, 10–11px, letter-spacing 0.16em, `text-faint` — section eyebrows, index numbers, column headers. The system's quiet signature.
- Minimal text. Never shout, never look corporate. Generous line-height (1.6 body), oversized whitespace.

## Layout — editorial architecture

Not a SaaS shell. The app reads as a **bound index**: a fixed left *contents column* (wordmark set in the display face, numbered nav entries `01 — Dashboard`, hairline rules) and a thin top *folio line* (current section, date, search, account). Content sits on the ivory page at `max-w-6xl` with asymmetric editorial grids — a wide primary column and a narrow annotation column where the content calls for it. Sections separate with hairlines and whitespace, not boxes. Corners `radius-sm/md` (subtle, consistent).

## Motion

Physical and disappearing: soft fade-rise on mount (`.rise` with stagger), gentle transform on hover (no scale-pops), 200–400ms ease-out-expo. Framer Motion for stateful transitions only. Every animation respects `prefers-reduced-motion` (custom keyframes globally disabled under it in `globals.css`).

## Trust-tier rendering (product rule, non-negotiable)

- Verified fact: plain ink text + source link.
- AI inference: `inference` Badge variant (silver mist) + confidence where available.
- Recommendation: explicitly labeled ("Recommended action", "AI Strategic Summary").

## Mandatory states

Every list/detail screen implements: **loading** (Skeleton, shaped like the content), **empty** (EmptyState: microlabel, title, guidance, action — set like a colophon page, never a blank div), **error** (message + retry).

## Accessibility & input

Keyboard-first: ⌘K palette, `focus-visible` rings (`ring-accent/40`), semantic HTML, labels on all inputs, WCAG-conscious contrast (ink ≥ 7:1, muted ≥ 4.5:1 on ivory). Decorative rules and numerals are `aria-hidden`.
