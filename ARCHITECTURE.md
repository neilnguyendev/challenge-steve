# Architecture

_Last updated: 2026-08-16 — describes the walking skeleton, not a finished system._

## 1. Quality goal

One thing outranks everything else here: **what an admin saves is exactly what the dashboard shows.** No caching layer, no derived columns, no figure computed in two places. Where that trades against performance, correctness wins — the working set is seven rows.

Second: a stranger on a clean machine gets it running from the README without asking anyone a question.

## 2. Scope

**In:** a weekly revenue chart with period comparison, three summary cards, an admin area to enter the daily figures, and the API between them.

**Out:** the four analysis tabs below the chart in the prototype (`Period Comparison`, `Year-over-Year`, `Budget Performance`, `Performance Score`), event-impact markers, multi-venue switching, and anything real-time.

## 3. Shape

```
browser ──► web (Next.js)  ──HTTP──►  api (Rails)  ──►  db (PostgreSQL)
```

Three containers, one network, defined in `docker-compose.yml`. The frontend never touches the database; the API never renders HTML.

The browser calls the API **directly** rather than through a Next.js proxy route. That is why `NEXT_PUBLIC_API_BASE_URL` must be a host address and why the API needs CORS — both follow from this one decision.

## 4. Codemap

### `api/` — Rails 7.1, API-only

```
app/
  controllers/api/v1/
    base_controller.rb     core   — error envelope, shared rescues
    venues_controller.rb   feature
  models/                  core   — Venue, TradingDay, AdminUser
  services/                feature — query objects; aggregation lives here
config/
  initializers/cors.rb
  database.yml             reads DATABASE_URL in every environment
db/
  migrate/
  seeds.rb                 idempotent
spec/                      mirrors app/ — models/, requests/, factories/
bin/docker-dev-entrypoint  waits for db, runs db:prepare, execs the server
```

**Controllers stay thin.** Parse parameters, call a service or model, render. Anything with a business rule in it belongs in `app/services/` as a query object — testable without a request, reusable if a second endpoint needs the same numbers.

**The response envelope** lives in `base_controller.rb` and is the convention every endpoint follows:

- success → the resource at the top level, no wrapper key
- failure → `{ "error": "<message>" }`, with the status set by a `rescue_from`

Controllers raise; they do not hand-roll error rendering.

### `web/` — Next.js 16, App Router

```
src/
  app/               feature — routes; a page fetches and composes
  lib/api.ts         core    — the only module that calls fetch()
```

**All API access goes through `lib/api.ts`.** Base URL, error shape and cache policy are decided once there. A component that calls `fetch` directly is a bug.

**Visual system.** Colour, spacing and radius are CSS custom properties in `globals.css`, exposed to Tailwind through `@theme inline` so components name intent (`text-text-muted`, `bg-surface-sunken`) rather than a shade. There are two palettes — light and dark — and the dark one is not a filter over the light one: the chart in particular carries its own, because near-black bars disappear on a dark surface.

Two rules the tokens exist to keep:

- **Every text step clears 4.5:1 against its surface.** `slate-600` and `emerald-600` do not, which is why the muted and positive tokens are a step darker than the shades usually reached for. Checked by measuring rendered colour in a real browser, not by eye.
- **Colour never carries meaning alone.** A change against last week is green or red *and* signed; a refused figure is outlined *and* described in text beside the field it belongs to.

The public dashboard deliberately tracks the client's prototype — its chart colours, its borderless summary cards, its bracketed percentages. The admin pages have no prototype to answer to and are designed on the token system alone.

**Package manager: pnpm**, with the version named by `packageManager` in `package.json`. pnpm 10 reads that field and switches itself to match, so any pnpm 10.x on a developer's machine behaves as the pinned one — no Corepack involved, which matters because Node stopped bundling Corepack at v25.

Two consequences worth knowing: `npm install` here produces a lockfile the Docker build will not match, and pnpm blocks dependency install scripts by default — a package that needs one has to be listed under `pnpm.onlyBuiltDependencies`, or it fails silently at runtime rather than at install.

### Tests

Co-located by convention of each stack: RSpec under `api/spec/` mirroring `app/`; Vitest beside the source as `*.test.ts(x)`. One suffix only — never mix `.test` and `.spec` in the frontend.

## 5. Data model

```
venues        (id, name, timezone)
trading_days  (id, venue_id, date, pos_revenue, eatclub_revenue,
               labour_cost, covers)          -- unique (venue_id, date)
admin_users   (id, email, password_digest)
```

A `trading_days` row is one venue's day of trading. Money is whole AUD.

## 6. Domain vocabulary

| Term | Meaning |
|---|---|
| **Covers** | Guests served in a day. Not orders, not tables. |
| **POS revenue** | Takings at the till. The client also calls this *Direct Revenue* — same thing. |
| **Eatclub revenue** | Takings through the Eatclub platform. |
| **Total revenue** | `POS + Eatclub`. Derived, never stored. |
| **Trading day** | One day a venue was open for business. |

## 7. Invariants

These hold system-wide. Violating one is a bug regardless of which layer it happens in.

- **INV-001 — Total revenue is derived.** `total = pos + eatclub`, computed at read time. No column, no admin input, no second source of truth.
- **INV-002 — The series is always seven days.** A date with no `trading_days` row is returned zero-filled. Consumers never handle gaps.
- **INV-003 — Averages divide by seven.** `average_per_day = total / 7`, never by the count of days that happen to have data.
- **INV-004 — A zero baseline yields `null`, never infinity.** Any percentage change against a zero previous value is `null`.
- **INV-005 — Money crosses the wire as integers.** No floats, no pre-formatted currency strings. Formatting is the frontend's job.
- **INV-006 — No caching between admin write and dashboard read.**

## 8. Security

Admin endpoints live under `/api/v1/admin/*` and require a JWT signed with `JWT_SECRET`. Everything else is public — the dashboard is a customer-facing view.

Passwords are bcrypt-hashed via `has_secure_password`. No secret is committed; `.env` is gitignored and `.env.example` carries placeholder values only.

## 9. Decisions

Recorded as ADRs in [`docs/adr/`](docs/adr/).

| # | Decision |
|---|---|
| [0001](docs/adr/0001-record-architecture-decisions.md) | Record architecture decisions |
| [0002](docs/adr/0002-rails-api-plus-nextjs-over-monolith.md) | Rails API + Next.js rather than a Rails monolith |
| [0003](docs/adr/0003-derive-total-revenue.md) | Derive total revenue instead of storing it |
| [0004](docs/adr/0004-aggregate-in-the-backend.md) | Aggregate in the backend, not the browser |
| [0005](docs/adr/0005-docker-for-everything.md) | Docker as the only prerequisite |
| [0006](docs/adr/0006-symmetrical-chart-labels.md) | Symmetrical chart labels, diverging from the prototype |

## 10. Running it

Everything is in the [README](README.md). The commands that matter:

| | |
|---|---|
| Start | `docker compose up --build` |
| Backend tests | `docker compose exec api bundle exec rspec` |
| Frontend tests | `docker compose exec web pnpm test` |
| Reset database | `docker compose down -v && docker compose up --build` |

## 11. Status

Walking skeleton. What exists: the three containers, the data model with migrations and a seed, the error envelope, one end-to-end endpoint (`GET /api/v1/venues`) proving the whole path, and a green test suite on both sides.

What does not exist yet: the revenue-trend endpoint, the chart, the summary cards, and the entire admin area. Those are specified in [`docs/tasks/`](docs/tasks/).
