# 16 · UI/UX Design System — "Vellum"

> **Active design language (owner pivot, 2026-07-06).** Vellum supersedes both the earlier *Atelier / Warm Editorial* system and the short-lived dark *Opaline* experiment. Tokens live in `src/app/globals.css` `@theme`. Components use token classes only — a raw hex in a component is a defect.

## Concept

MarketMind AI is presented as a **luxury art publication**, not software: museum-quality editorial design crossed with high-end architecture and gallery catalogues. Someone seeing a screenshot with no context should think *"this is a premium design book,"* not *"this is a SaaS app."* Premium comes entirely from **composition, typography, spacing, colour, and craft** — never from effects.

## Non-negotiables (owner direction)

- **Light only.** No dark backgrounds, no black UI.
- **No motion.** No animations, no transitions-as-decoration, no parallax. Stillness is the aesthetic. (`.rise`/stagger classes are retained as no-ops so legacy markup renders instantly.)
- **No gradients, glassmorphism, blur, neon, or glow.** No cyber/gaming/flashy anything.
- **Banned hues:** pink, maroon, orange, light-brown/biscuit, purple, neon, and generic white-and-blue SaaS blue.

## Palette — refined light, custom and exclusive

Sophisticated pale tones only — porcelain, limestone, bone, pearl, champagne, with botanical and mineral accents. Colour is a **mark**, never a flood.

| Token | Hue | Meaning — use for nothing else |
| --- | --- | --- |
| `background` | pale limestone / oat (#F3F2EC) | the page |
| `surface` | porcelain (#FBFAF6) | panels (lighter than the page) |
| `surface-raised` / `surface-overlay` | white | raised / modals / inputs |
| `ink-wash` | graphite (#23231F) | inverted blocks — ink buttons, footers |
| `foreground` | graphite (#23231F) | primary text (never pure black) |
| `muted` / `faint` | stone / silver mist | secondary / tertiary text |
| `border` / `border-strong` | limestone hairline / ink | rules |
| `accent` | deep sage (#566B4F) | primary / positive marks, links-in-ink |
| `live` | mineral blue (#4E6B78) | live data, links |
| `inference` | platinum pewter (#6C7079) | **AI inference** markers (trust tier 2) |
| `score` | pale antique gold (#8A7A3E) | scores, ledger rules on figures |
| `warning` | muted bronze-gold (#8C7A3B) | warnings only |
| `critical` | restrained brick (#A24A45) | critical only |

## Typography — part of the identity

- **Display: editorial serif** (`font-display`, Instrument Serif / Canela-class) — large, confident, magazine hierarchy; titles and figures of consequence.
- **Body/UI: Inter** (`font-sans`) — quiet, precise.
- **Data: JetBrains Mono** (`.font-data`, tabular) — every score, count, time, ID.
- **Microlabels** (`.microlabel`): mono uppercase, 10–11px, 0.16em tracking, `text-faint` — eyebrows, index numerals, column heads. The quiet signature.
- Confident whitespace, generous line-height (1.6 body), strong vertical rhythm.

## Layout — architectural, not mechanical

Large whitespace, precise alignment, asymmetric editorial grids (wide primary column + narrow annotation column). Sections are **curated, rule-separated by hairlines and space** — not stacked boxes. Left **IndexNav** contents column (numbered) + thin **FolioBar** folio line. `max-w-6xl` measure, museum margins. Grids read like an architecture portfolio.

## Components — custom, crafted

- **Button:** primary = an ink block with paper-coloured type (luxury-print signature); secondary = hairline outline; ghost; danger = restrained brick outline. Square, no radius theatrics, no glow.
- **Card:** porcelain plate closed by a fine hairline; prefer rule-separated sections over boxes where possible.
- **Charts / metrics = information design,** not analytics chrome: ranked hairline bars, ledger figures, definition rows — not neon dashboards.
- **Badge / Input:** quiet mono tint / porcelain field with a sage focus ring.

## Trust-tier rendering (product rule, non-negotiable)

- Verified fact: plain graphite text + source link.
- AI inference: `inference` Badge variant (platinum) + confidence where available.
- Recommendation: explicitly labelled ("Recommended action", "AI assessment").

## Mandatory states

Every list/detail screen implements **loading** (still limestone Skeleton, no pulse), **empty** (EmptyState — composed like a colophon plate), **error** (message + retry). Each is a considered composition, never a blank div.

## Accessibility & input

Keyboard-first: ⌘K palette, `focus-visible` rings (`ring-accent/40`), semantic HTML, labels on all inputs, WCAG-conscious contrast (graphite ≥ 7:1, muted ≥ 4.5:1 on limestone). Decorative rules and numerals are `aria-hidden`. `prefers-reduced-motion` is honoured (there is essentially no motion to reduce).
