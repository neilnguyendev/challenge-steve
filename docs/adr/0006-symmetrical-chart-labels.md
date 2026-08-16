# 6. Symmetrical chart labels, diverging from the prototype

**Status:** Accepted · 2026-08-16

## Context

The prototype's legend names the current-period bars `POS Revenue` and `Eatclub Revenue`, and the previous-period bars `Direct Revenue (Previous)` and `Total Revenue (Previous)`.

Those two naming schemes are not the same. The current period names each segment after what it contains; the previous period names the upper segment after the running total of the whole bar.

Each legend entry carries its own colour swatch matching one segment, so `Total Revenue (Previous)` is attached to a single segment rather than to the bar. Given the client's formula — `POS = Direct` and `POS + Eatclub = Total` — that segment is Eatclub revenue.

## Decision

Use symmetrical labels across both periods:

| Prototype | Implementation |
|---|---|
| `Direct Revenue (Previous)` | `POS Revenue (Previous)` |
| `Total Revenue (Previous)` | `Eatclub Revenue (Previous)` |

No legend entry is named `Total Revenue`. Confirmed with the client before implementing.

## Consequences

- The legend describes what the segments contain. A reader comparing the two periods is not silently told they measure different things.
- Labels compose from three metric names plus a period suffix instead of six hard-coded strings, so the two sides cannot drift apart.
- `Total Revenue` disappearing from the legend loses nothing: the figure is in the KPI card above the chart, and the stack height shows it.
- The rendered chart differs visibly from the prototype. Noted in the README so a reviewer reads it as a decision rather than a mistake.
- If the client later reverses this, the change is a lookup table in `lib/chart-theme.ts` — no data model or API impact.
