# BE-05 · `GET /api/v1/revenue_trend` — weekly aggregation with period comparison

| | |
|---|---|
| **Type** | Feature |
| **Component** | Backend (Rails, API-only) |
| **Depends on** | BE-02 (models, migrations, seeds) |
| **Blocks** | FE-03 (KPI cards), FE-04 (chart) |

---

## Context

This is the single endpoint that feeds the entire dashboard view. Every number the user sees — the three KPI cards, all seven days of bars, the comparison percentages — comes from one request.

Every calculation happens here, not in the browser. The frontend receives finished numbers and renders them.

The endpoint is public — no authentication. Authentication applies only to `/api/v1/admin/*`.

---

## Domain model

Two revenue streams are recorded per day. Total revenue is **derived**, never stored and never entered:

| Concept | Storage |
|---|---|
| POS revenue — the client also calls this *Direct Revenue* | `trading_days.pos_revenue` |
| Eatclub revenue | `trading_days.eatclub_revenue` |
| **Total revenue** = POS + Eatclub | computed at request time |
| Labour costs | `trading_days.labour_cost` |
| Covers (guests served) | `trading_days.covers` |

Tables assumed to exist from BE-02:

```
venues       (id, name, timezone)
trading_days (id, venue_id, date, pos_revenue, eatclub_revenue,
              labour_cost, covers)              -- unique index on (venue_id, date)
```

A row is one venue's day of trading. A missing row means the venue did not trade, or has not been recorded yet — the endpoint treats both the same way: a zero-filled day.

---

## Request

```
GET /api/v1/revenue_trend?venue_id=1&week_start=2026-08-10&compare=true
```

| Param | Required | Default | Notes |
|---|---|---|---|
| `venue_id` | no | first venue | 404 if the venue does not exist |
| `week_start` | no | Monday of the current week | Must be a Monday, format `YYYY-MM-DD` |
| `compare` | no | `false` | `true` adds the previous-period block |

---

## Response

```jsonc
200 OK
{
  "period":          { "start": "2026-08-10", "end": "2026-08-16" },
  "previous_period": { "start": "2026-08-03", "end": "2026-08-09" },  // null when compare=false
  "available_range": { "earliest": "2026-08-03", "latest": "2026-08-16" },
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

Rules for the payload shape:

- `previous` uses the same field names as `current` — the two periods are structurally identical.
- `series[]` carries **no `total_revenue` field**. The daily total is the sum of the two components; the weekly total is in `summary`.
- `available_range` reports the earliest and latest dates with any recorded trading, for the venue, regardless of the week requested. The dashboard uses it to stop paging backwards into weeks that were never recorded. Both values are `null` when the venue has no recorded days at all.
- Money is returned as integers. No floats, no currency formatting — that is the frontend's job.

When `compare=false`:

- `previous_period` is `null`
- every `summary.*.previous` and `summary.*.delta_pct` is `null`
- every `series[].previous` is `null`

---

## Business rules

| Rule | Definition |
|---|---|
| `total_revenue` | `Σ (pos_revenue + eatclub_revenue)` across the seven days |
| `average_per_day` | `total_revenue / 7` — **always divides by 7**, never by the number of days that have data. Rounded to the nearest whole unit |
| `total_covers` | `Σ covers` across the seven days |
| `delta_pct` | `((current − previous) / previous) × 100`, rounded to one decimal place |
| **Division by zero** | When `previous` is `0`, `delta_pct` is `null`. Never `Infinity`, never `NaN`, never `100.0` |
| **Missing days** | A day with no `trading_days` row still appears in `series` with every value set to `0`. The array is always length 7 |
| **Previous period** | The seven days immediately preceding `week_start` |
| **Caching** | None — the response must reflect the latest admin save |

---

## Validation

| Condition | Response |
|---|---|
| `week_start` is not a Monday | `422` — `{ "error": "week_start must be a Monday" }` |
| `week_start` is not a valid date | `422` — `{ "error": "week_start must be a valid date in YYYY-MM-DD format" }` |
| `venue_id` does not exist | `404` — `{ "error": "Venue not found" }` |
| No venues exist at all | `404` — `{ "error": "No venue configured" }` |

---

## Acceptance criteria

```gherkin
AS-1  Default request without comparison
  Given the week of 2026-08-10 has 7 trading_days rows
  When GET /api/v1/revenue_trend?week_start=2026-08-10&compare=false
  Then the response is 200
  And series contains exactly 7 entries
  And previous_period is null
  And every series[].previous is null
  And summary.total_revenue.delta_pct is null

AS-2  Comparison against the previous week
  Given both the week of 2026-08-10 and the week of 2026-08-03 have data
  When GET with compare=true
  Then previous_period is { start: 2026-08-03, end: 2026-08-09 }
  And summary.total_revenue.current equals the sum of pos_revenue + eatclub_revenue across the current week
  And summary.total_revenue.delta_pct matches ((current - previous) / previous * 100) rounded to 1dp
  And series[].previous uses the same field names as series[].current

AS-3  Previous period has no data
  Given the week of 2026-08-03 has no trading_days rows
  When GET with compare=true
  Then summary.total_revenue.previous is 0
  And summary.total_revenue.delta_pct is null
  And no error is raised

AS-4  A day is missing from the current week
  Given there is no trading_days row for 2026-08-12
  When GET
  Then series still contains an entry with date 2026-08-12 and weekday "Wed"
  And every value in that entry's current object is 0

AS-5  week_start is not a Monday
  Given week_start=2026-08-11, which is a Tuesday
  When GET
  Then the response is 422
  And the error message is "week_start must be a Monday"

AS-6  Average per day divides by seven
  Given only 3 of the 7 days have data, totalling 7000
  When GET
  Then summary.average_per_day.current is 1000
  And not 2333

AS-8  Available range spans all recorded trading, not the requested week
  Given the venue has trading_days rows from 2026-08-03 to 2026-08-16
  When GET is called with week_start=2026-08-10
  Then available_range is { earliest: 2026-08-03, latest: 2026-08-16 }
  And it is unchanged when a different week is requested

AS-9  Available range with no recorded trading
  Given the venue has no trading_days rows at all
  When GET is called
  Then available_range.earliest and available_range.latest are both null
  And series still contains 7 zero-filled entries

AS-7  Reflects admin changes immediately
  Given an admin PATCHes pos_revenue for 2026-08-12 to 2000
  When GET is called immediately afterwards
  Then series[Wed].current.pos_revenue is 2000
  And summary.total_revenue.current has increased by the delta
```

---

## Out of scope

| Item | Ticket |
|---|---|
| Admin authentication | BE-03 |
| Admin CRUD for `trading_days` | BE-04 |
| Event impact markers | Out of scope entirely |
| Year-over-year comparison | Out of scope entirely |
| Multi-venue switching in the UI | Out of scope entirely |
| Pagination or arbitrary date ranges — this endpoint is week-shaped by design | Out of scope entirely |

---

## Definition of done

- [ ] All 9 acceptance criteria pass
- [ ] Seed data includes at least 3 consecutive weeks so comparison is testable out of the box
- [ ] Response time under 100ms on seeded data
- [ ] `curl` with `compare=true` and `compare=false` both return valid JSON matching the contract above
- [ ] Zero-division and missing-day paths have explicit tests, not just happy-path coverage
