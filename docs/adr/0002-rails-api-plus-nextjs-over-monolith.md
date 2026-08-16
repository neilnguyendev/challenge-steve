# 2. Rails API + Next.js rather than a Rails monolith

**Status:** Accepted · 2026-08-16

## Context

The brief fixes the stack: Rails backend, Next.js frontend, PostgreSQL. What it leaves open is how tightly to couple them. Rails could render the dashboard itself with Hotwire and use Next.js for nothing, or serve JSON to a fully separate frontend.

The view is chart-heavy: a grouped-and-stacked bar chart with a comparison mode, three toggleable series, and PNG export. That is client-side work whichever way it is served.

## Decision

Two independent applications. Rails is API-only (`--api`) and never renders HTML. Next.js owns all rendering and calls the API over HTTP from the browser.

## Consequences

- The chart lives where charting libraries live. Recharts needs a React tree; giving it one is not a workaround.
- Two deployables, two dependency trees, two test suites. Accepted — the brief already implies both.
- The browser calls the API cross-origin, so CORS is mandatory and `NEXT_PUBLIC_API_BASE_URL` must be a host address rather than a container name. Both are consequences of this decision, not incidental configuration.
- Rejected: proxying the API through Next.js route handlers. It would remove the CORS requirement but add a hop that exists only to hide a header, and it hides the real API from anyone testing with `curl`.
