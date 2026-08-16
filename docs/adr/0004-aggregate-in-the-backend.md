# 4. Aggregate in the backend, not the browser

**Status:** Accepted · 2026-08-16

## Context

The dashboard shows three summary cards (total revenue, average per day, total covers), each with a percentage change against the previous week, plus seven days of chart data for two periods.

The API could return raw `trading_days` rows and let the frontend total them, or return finished numbers.

Some of the rules are not guessable from the data: average per day divides by seven regardless of how many days have figures, and a percentage change against a zero baseline is `null` rather than infinity.

## Decision

One endpoint, `GET /api/v1/revenue_trend`, returns everything the view needs already computed: the summary block, the seven-day series for both periods, and the percentage deltas. The frontend renders and formats; it calculates nothing.

## Consequences

- The KPI cards and the chart cannot disagree. They read the same computed numbers rather than each deriving their own.
- Business rules live in one testable place — a query object under `app/services/` — instead of being spread across React components.
- Rules like "divide by seven, not by the number of populated days" are enforced where they can be unit-tested, not encoded in a component someone will later "simplify".
- The endpoint is shaped for this view. That is intentional; it is not a general-purpose reporting API, and it takes a week rather than an arbitrary date range.
- Cost: a new view needing a different cut of the same data needs backend work. Acceptable at this size, and the query object is reusable.
