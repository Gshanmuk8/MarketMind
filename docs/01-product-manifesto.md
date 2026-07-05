# 01 · Product Manifesto

This document is canon. Every feature, screen, and line of copy is measured against it.

## The one test

> Does this help the founder decide what to build, what to ignore, and what to do next?

If a feature can't answer that, simplify it or remove it. MarketMind AI is a **decision-making platform**, not a monitoring platform.

## The problem we solve

Founders have too much information and almost no intelligence. They don't need another feed — they need an analyst who reads everything and explains what changed, why it matters, whether they should care, and what to do.

## The Intelligence Layer

Raw data is never shown first. Every signal passes through:

```
Raw Event → Context → Business Impact → Strategic Meaning → Recommendation
```

Concretely: monitors call `enrichSignal()` (`src/features/signals/intelligence.ts`) before `recordSignal()`, so every stored signal carries `whyItMatters` and `recommendation`. Never ship a UI that surfaces a raw event without them.

**Wrong:** "OpenAI released a new model."
**Right:** "OpenAI released a new model → competitors using it can now offer memory → your personalization advantage erodes → consider implementing memory before Q4."

## Trust tiers

Never present speculation as fact. Three tiers, always visually distinct:

| Tier | Where it lives | UI treatment |
| --- | --- | --- |
| Verified Public Information | `Signal.isInference = false` | plain |
| AI Inference | `Signal.isInference = true` + confidence | `inference` badge (ice blue) |
| Reasoned Recommendation | `Signal.recommendation`, `Insight` rows | labeled "recommendation" |

## The user journey

1. Sign in — no complicated onboarding.
2. Enter one thing: the company website.
3. Company Understanding Engine builds the profile (editable later).
4. Competitors discovered automatically, with confidence scores; user accepts/rejects/adds.
5. Baseline intelligence report — a snapshot, not a change report.
6. Always-on monitoring of legally/ethically public sources only.
7. Everything delivered as conclusions, not raw events.

## Notifications are an assistant, not a newsletter

- Users control channel, time (HH:MM, their timezone), frequency, topics, and priority.
- Related events are grouped into one Smart Digest topped by an AI Strategic Summary.
- Quiet hours, weekend pause, vacation mode, snooze. Critical may override quiet hours only if the user opts in.
- Never send an empty digest. Never spam.

## Long-term vision

The first thing a founder opens every morning — not because it tells them everything, but because it tells them exactly what matters.
