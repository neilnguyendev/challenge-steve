# FE-04 · RevenueTrendChart — grouped bar chart with compare mode

| | |
|---|---|
| **Type** | Feature |
| **Component** | Frontend (Next.js) |
| **Depends on** | FE-01 (project scaffold), BE-05 (API contract) |
| **Blocks** | FE-06 (export PNG) |

---

## Context

This is the centrepiece of the dashboard. It renders one week of trading data — Monday through Sunday — as a grouped bar chart. Each day shows a stacked revenue bar plus a separate labour-cost bar. When the user turns on **Compare to Previous**, a second, muted group appears alongside each day showing the same metrics for the previous week.

Three checkboxes in the page header control which series are visible. The chart reacts to them without reflowing the remaining bars.

This ticket covers the chart only. The header controls, KPI cards and PNG export are separate tickets — this component receives its state as props and does not own it.

---

## Domain model

Two revenue streams are recorded per day, and total revenue is derived from them:

```
POS Revenue      (the client also calls this "Direct Revenue")
Eatclub Revenue
                 → Total Revenue = POS + Eatclub   (never stored, never entered)
Labour Costs
Covers
```

Both periods have identical structure. There is no third revenue bucket.

Server-side these live on `trading_days` — one row per venue per day of trading. A day with no row is returned zero-filled, so the chart always receives seven days.

---

## API contract consumed

```
GET /api/v1/revenue_trend?venue_id=1&week_start=2026-08-10&compare=true
```

```jsonc
{
  "period":          { "start": "2026-08-10", "end": "2026-08-16" },
  "previous_period": { "start": "2026-08-03", "end": "2026-08-09" },  // null when compare=false
  "summary": {
    "total_revenue":   { "current": 15974, "previous": 14982, "delta_pct": 6.6 },
    "average_per_day": { "current": 2282,  "previous": 2140,  "delta_pct": 6.6 },
    "total_covers":    { "current": 871,   "previous": 820,   "delta_pct": 6.2 }
  },
  "series": [
    {
      "date": "2026-08-10",
      "weekday": "Mon",
      "current":  { "pos_revenue": 1750, "eatclub_revenue": 320, "labour_cost": 590, "covers": 118 },
      "previous": { "pos_revenue": 1520, "eatclub_revenue": 320, "labour_cost": 540, "covers": 110 }
    }
    // ... always exactly 7 entries
  ]
}
```

`series[].previous` is `null` when `compare=false`. `series` is always 7 entries long. `previous` uses the same field names as `current`.

---

## Component interface

```tsx
type SeriesKey = 'pos' | 'eatclub' | 'labour'

interface RevenueTrendChartProps {
  data: RevenueTrendResponse
  compareMode: boolean
  visibleSeries: Record<SeriesKey, boolean>
}
```

No data fetching, no local state beyond chart internals. The parent page owns `compareMode` and `visibleSeries` and re-fetches when `compareMode` changes.

---

## Scope

Built with Recharts.

### Default mode (`compareMode = false`)

Two bars per day:

1. **Revenue** — stacked: `pos_revenue` (near-black) at the bottom, `eatclub_revenue` (indigo) on top
2. **Labour** — single bar, solid orange

### Compare mode (`compareMode = true`)

Four bars per day. The two above, plus:

3. **Previous revenue** — stacked: previous `pos_revenue` (grey) at the bottom, previous `eatclub_revenue` (pale indigo) on top
4. **Previous labour** — single bar, pale orange

Previous-period bars sit to the right of their current-period counterparts and use desaturated versions of the same hues.

### Axes and grid

- **Y axis:** fixed ticks at `0`, `750`, `1500`, `2250`, `3000`, formatted as `0k / 0.75k / 1.5k / 2.25k / 3k`. No axis line.
- **X axis:** weekday labels taken from `series[].weekday`. No axis line, no tick marks.
- **Grid:** horizontal dashed lines only. No vertical grid lines.

### Tooltip

Hovering anywhere within a day — including any individual segment of a stacked bar — opens one tooltip for that day. There is no separate per-segment tooltip.

- Header: the weekday and date
- One row per currently-visible series, showing its label and exact amount formatted `$1,234` (no decimals, thousands separator)
- **Stacked segments show their own value, not the running total.** In a $2,070 bar made of $1,750 POS and $320 Eatclub, the Eatclub row reads `$320`
- In compare mode, previous-period rows appear in the same tooltip, suffixed `(Previous)`
- Unchecked series do not appear
- No total row — that figure is in the KPI card above the chart

### Legend

Rendered below the chart, driven by the same `visibleSeries` state:

| Mode | Entries |
|---|---|
| Default | POS Revenue · Eatclub Revenue · Labour Costs |
| Compare | POS Revenue (Current) · Eatclub Revenue (Current) · Labour Costs (Current) · POS Revenue (Previous) · Eatclub Revenue (Previous) · Labour Costs (Previous) |

Unchecking a series removes both its current and its previous entry from the legend.

**Labels differ from the prototype**, which names the previous-period stack `Direct Revenue (Previous)` and `Total Revenue (Previous)`. Signed off by the BA — rationale recorded in `docs/explore/revenue-trend-dashboard.md`. No legend entry is labelled `Total Revenue`; that figure is shown in the KPI card above the chart.

### Series toggling

When a checkbox is turned off, the corresponding bars disappear from every day group. **The remaining bars keep their position and width** — the group does not re-centre or expand to fill the gap.

---

## Acceptance criteria

```gherkin
AS-1  Default render
  Given the API returns 7 days of data and compareMode is false
  When the dashboard loads
  Then each day displays exactly 2 bars
  And bar 1 is a stack with POS revenue (near-black) below and Eatclub revenue (indigo) above
  And bar 2 is a solid orange Labour Costs bar
  And the legend shows exactly 3 entries

AS-2  Enabling compare mode
  Given compareMode is false
  When the user enables "Compare to Previous"
  Then each day displays 4 bars
  And the previous-period group uses muted colours and sits to the right of the current group
  And the legend shows 6 entries, symmetrical across the two periods
  And no legend entry is labelled "Total Revenue" or "Direct Revenue"

AS-3  Previous stack totals correctly
  Given Monday's previous values are pos_revenue 1520 and eatclub_revenue 320
  When compare mode is on
  Then the previous revenue bar reaches 1840 on the Y axis
  And not 3360

AS-4  Toggling a series off
  Given all three series checkboxes are checked
  When the user unchecks "Labour Costs"
  Then every Labour bar disappears, both current and previous
  And the legend hides "Labour Costs (Current)" and "Labour Costs (Previous)"
  And the tooltip no longer contains a Labour Costs row
  And the remaining bars keep their original position and width

AS-5  Y axis is stable
  Given the highest value in the dataset is 2,400
  When the chart renders
  Then the Y axis still shows ticks at 0k / 0.75k / 1.5k / 2.25k / 3k
  And the tallest bar reaches roughly 80% of the plot height

AS-6  Empty state
  Given the API returns a series where every day is zero
  When the chart renders
  Then "No data for this period" is displayed instead of the chart
  And no error is thrown

AS-7  Data reflects admin input
  Given an admin sets pos_revenue for Wednesday to 2000
  When the user reloads the dashboard
  Then the black segment of Wednesday's revenue bar corresponds to 2000 on the Y axis

AS-8  Tooltip contents
  Given compareMode is true and all series are visible
  And Saturday's POS revenue is 2150 and Eatclub revenue is 400
  When the user hovers any part of Saturday, including the indigo segment
  Then one tooltip opens listing all 6 values for Saturday
  And the Eatclub Revenue row reads $400, not $2,550
  And previous-period rows are suffixed "(Previous)"
  And every monetary value is formatted as $1,234
```

---

## Out of scope

| Item | Ticket |
|---|---|
| Header checkboxes and the Compare toggle itself | FE-05 |
| KPI summary cards | FE-03 |
| Export PNG | FE-06 |
| Data fetching and week selection | FE-05 |
| Event impact markers | Out of scope entirely |
| Mobile layout below 1024px | Out of scope entirely |

---

## Definition of done

- [ ] All 8 acceptance criteria pass
- [ ] Automated tests cover the compare-off, all-zero and AS-3 stack-total cases
- [ ] Renders correctly at 1024px, 1440px and 1920px widths
- [ ] README documents the legend-label difference from the prototype
