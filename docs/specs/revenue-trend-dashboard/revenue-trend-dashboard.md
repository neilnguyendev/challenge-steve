# Spec: Revenue Trend Dashboard

**Created:** 2026-08-16
**Last updated:** 2026-08-16
**Status:** Draft
**Snapshot limit:** 5

## Overview

A weekly revenue dashboard for a hospitality venue: a bar chart of seven trading days with an optional comparison against the previous week, three headline figures above it, and an admin area where a manager enters the daily numbers that feed all of it.

This spec covers the seven stories not already specified elsewhere. Two units are specified in full in their own files and are **not** repeated here:

| Unit | Spec | Role |
|---|---|---|
| BE-05 | [`docs/tasks/BE-05-revenue-trend-endpoint.md`](../../tasks/BE-05-revenue-trend-endpoint.md) | `GET /api/v1/revenue_trend` — the only data source for the dashboard |
| FE-04 | [`docs/tasks/FE-04-revenue-trend-chart.md`](../../tasks/FE-04-revenue-trend-chart.md) | `RevenueTrendChart` — presentational, receives state as props |

Build order puts both before the stories below; every story here treats them as available.

**Source:** `docs/explore/revenue-trend-dashboard.md`

## Data Model

No new entities. The skeleton already provides:

```
venues        (id, name, timezone)
trading_days  (id, venue_id, date, pos_revenue, eatclub_revenue,
               labour_cost, covers)          -- unique (venue_id, date)
admin_users   (id, email, password_digest)
```

Total revenue is derived (`pos + eatclub`), never stored. Money is whole AUD. A date with no `trading_days` row means the venue did not trade and is served zero-filled.

Admin sessions are bearer tokens signed with `JWT_SECRET`; nothing is persisted server-side.

## Stories

### S-001: Choose what the chart shows (P0)

**Description:** As someone reading the dashboard, I want to switch between periods, turn individual series on and off, and move between weeks, so I can look at the part of the trading picture I care about.

**Source:** `docs/explore/revenue-trend-dashboard.md#41-fe--view-chính-public` — Header động; Chart 2 mode.
**Applies Constraints:** C-003

This story owns the page state (`weekStart`, `compareMode`, `visibleSeries`) and the data fetch. FE-04 and S-002 receive it as props and own none of it.

**Execution:**
- `depends_on:` none
- `parallel_safe:` false
- `files:` `web/src/app/page.tsx`, `web/src/components/dashboard/DashboardHeader.tsx`, `web/src/components/dashboard/useRevenueTrend.ts`, `web/src/lib/api.ts`
- `autonomous:` true
- `verify:` `docker compose exec web pnpm test` and open http://localhost:3000

**Acceptance Scenarios:**

AS-001: Default load shows the current week
- **Given:** the venue has trading data for the current week
- **When:** a visitor opens the dashboard without choosing anything
- **Then:** the heading reads "This Week's Revenue Trend", the chart shows Monday to Sunday of the current week, and all three series are shown
- **Data:** current week Monday = the Monday of today's week
- **Setup:** seeded venue with three consecutive weeks

AS-002: Turning on comparison reloads against the previous week
- **Given:** the dashboard is showing the week beginning 2026-08-10 without comparison
- **When:** the visitor turns on "Compare to Previous"
- **Then:** the heading becomes "This Week's Revenue Trend vs Previous Period", the previous week's figures are requested from the API, and the control shows itself as active
- **Data:** week beginning 2026-08-10; previous week beginning 2026-08-03

AS-003: Hiding a series updates the chart without refetching
- **Given:** all three series are shown
- **When:** the visitor unticks "Labour Costs"
- **Then:** the chart receives the series as hidden and no further request is made to the API
- **Data:** series keys pos, eatclub, labour

AS-004: Moving to an earlier week loads that week
- **Given:** the dashboard is showing the week beginning 2026-08-10
- **When:** the visitor moves to the previous week
- **Then:** the figures for the week beginning 2026-08-03 are requested and shown, and the comparison setting is kept as it was
- **Data:** two weeks of seeded data

AS-005: The API being unavailable is reported without breaking the controls
- **Given:** the API cannot be reached
- **When:** a visitor opens the dashboard
- **Then:** a message says the figures could not be loaded, and the period and series controls remain usable so the visitor can retry
- **Data:** API returns a failure for every request

AS-025: Browsing backwards stops at the earliest recorded week
- **Given:** the earliest week with any recorded trading begins 2026-08-03, and the dashboard is showing that week
- **When:** the visitor looks at the move-to-earlier-week control
- **Then:** it is unavailable, so the visitor cannot page into weeks that were never recorded
- **Data:** earliest recorded date 2026-08-03; the response reports the recorded range

### S-002: Read the week's headline figures (P0)

**Description:** As someone reading the dashboard, I want total revenue, average per day and total covers at the top, with the change against the previous week when I am comparing, so I can judge the week at a glance.

**Source:** `docs/explore/revenue-trend-dashboard.md#3-kpi-card`.
**Applies Constraints:** C-002, C-004

**Execution:**
- `depends_on:` S-001
- `parallel_safe:` false
- `files:` `web/src/components/dashboard/SummaryCards.tsx`, `web/src/components/dashboard/SummaryCards.test.tsx`
- `autonomous:` true
- `verify:` `docker compose exec web pnpm test`

**Acceptance Scenarios:**

AS-006: Three figures with no comparison
- **Given:** comparison is off and the week totals $16,977 across 950 covers
- **When:** the cards render
- **Then:** they read Total Revenue $16,977, Average per Day $2,425, and Total Covers 950, with no comparison text
- **Data:** total 16977, covers 950; average = 16977 / 7 = 2425

AS-007: Comparison shows both figures and a signed change
- **Given:** comparison is on, this week totals $15,974 and the previous week $14,982
- **When:** the cards render
- **Then:** the Total Revenue card reads "$15,974 vs $14,982 (+6.6%)" and the change is styled as an increase
- **Data:** current 15974, previous 14982, delta_pct 6.6

AS-008: A decrease reads as a decrease
- **Given:** comparison is on, this week totals $13,000 and the previous week $14,982
- **When:** the cards render
- **Then:** the change reads "(-13.2%)" and is styled as a decrease, distinguishably from an increase
- **Data:** current 13000, previous 14982, delta_pct -13.2

AS-009: No baseline to compare against
- **Given:** comparison is on and the API reports no change figure because the previous week had no trading
- **When:** the cards render
- **Then:** the previous figure reads $0 and no percentage is shown at all
- **Data:** previous 0, delta_pct null

### S-003: Admin signs in and privileged calls are gated (P0)

**Description:** As the venue manager, I want to sign in so that only I can change the figures, and I want everyone else's attempts to change them refused. A session lasts a day; after that I sign in again.

**Source:** `docs/explore/revenue-trend-dashboard.md#42-admin--auth`.
**Applies Constraints:** C-001

**Execution:**
- `depends_on:` none
- `parallel_safe:` false
- `files:` `api/app/controllers/api/v1/admin/sessions_controller.rb`, `api/app/controllers/api/v1/admin/base_controller.rb`, `api/app/services/admin_token.rb`, `api/config/routes.rb`, `api/spec/requests/api/v1/admin/sessions_spec.rb`
- `autonomous:` checkpoint
- `verify:` `docker compose exec api bundle exec rspec spec/requests/api/v1/admin`

**Acceptance Scenarios:**

AS-010: Correct credentials return a session token
- **Given:** an admin exists with email admin@example.com and password password123
- **When:** those credentials are submitted to the sign-in endpoint
- **Then:** the response carries a bearer token and the admin's email
- **Data:** admin@example.com / password123
- **Setup:** seeded admin

AS-011: Wrong password is refused without revealing which field was wrong
- **Given:** an admin exists with email admin@example.com
- **When:** that email is submitted with the password "wrong"
- **Then:** the request is refused with "Invalid email or password" and no token is issued
- **Data:** admin@example.com / wrong

AS-012: A privileged call with no token is refused
- **Given:** an admin exists
- **When:** the trading-day list is requested without a token
- **Then:** the request is refused as unauthenticated and no data is returned
- **Data:** no Authorization header

AS-013: A privileged call with a token that does not verify is refused
- **Given:** an admin exists
- **When:** the trading-day list is requested with a token that was not issued by this system
- **Then:** the request is refused as unauthenticated and no data is returned
- **Data:** a token signed with a different secret

AS-026: A session older than a day is refused
- **Given:** an admin signed in 25 hours ago
- **When:** the trading-day list is requested with that session's token
- **Then:** the request is refused as unauthenticated, the same way an absent token is
- **Data:** token issued 25 hours ago; sessions last 24 hours

### S-004: The figures for a week can be saved (P0)

**Description:** As the venue manager, I want to record or correct a week's takings, labour costs and covers in one go, so the dashboard shows what actually happened. The seven days are saved together: either all of them are recorded or none is.

**Source:** `docs/explore/revenue-trend-dashboard.md#43-admin--quản-trị-dữ-liệu`.
**Applies Constraints:** C-001, C-002, C-004, C-005

**Execution:**
- `depends_on:` S-003
- `parallel_safe:` false
- `files:` `api/app/controllers/api/v1/admin/trading_days_controller.rb`, `api/config/routes.rb`, `api/spec/requests/api/v1/admin/trading_days_spec.rb`
- `autonomous:` true
- `verify:` `docker compose exec api bundle exec rspec spec/requests/api/v1/admin`

**Acceptance Scenarios:**

AS-014: Listing a week returns seven days whether or not they were traded
- **Given:** a signed-in admin and a week where only Monday and Tuesday have figures
- **When:** the admin requests that week
- **Then:** seven entries come back in date order, with the five untraded days reading zero
- **Data:** week beginning 2026-08-10, rows for 08-10 and 08-11 only

AS-015: Saving a week replaces the days that already had figures
- **Given:** a signed-in admin and Wednesday 2026-08-12 recorded with POS revenue 1,830
- **When:** the admin saves the whole week with Wednesday's POS revenue changed to 2,000
- **Then:** Wednesday's POS revenue reads 2,000 and no second entry exists for that date
- **Data:** week beginning 2026-08-10; date 2026-08-12, pos_revenue 1830 → 2000

AS-016: The same save records the days that had none
- **Given:** a signed-in admin and no figures recorded for Thursday 2026-08-13
- **When:** the admin saves the whole week with Thursday set to POS 1,780, Eatclub 310, labour 600 and 108 covers
- **Then:** Thursday is recorded with those figures, and the week has one more traded day than before
- **Data:** week beginning 2026-08-10; new date 2026-08-13

AS-027: An unauthenticated save changes nothing
- **Given:** a week recorded with Wednesday at POS revenue 1,830, and no session
- **When:** a save is submitted for that week with Wednesday changed to 2,000
- **Then:** the request is refused as unauthenticated and Wednesday still reads 1,830
- **Data:** week beginning 2026-08-10; no Authorization header

AS-017: One bad figure abandons the entire save
- **Given:** a signed-in admin and a week where Wednesday currently reads POS revenue 1,830
- **When:** the admin saves the week with Wednesday changed to 2,000 and Friday's labour cost set to -1
- **Then:** the request is refused with a message naming Friday's labour cost, and Wednesday still reads 1,830 — no day in the week was altered
- **Data:** week beginning 2026-08-10; Wed pos_revenue 1830 → 2000, Fri labour_cost -1

### S-005: Signing in from the browser (P0)

**Description:** As the venue manager, I want a sign-in page and to be sent away from admin pages when I am not signed in, so I do not land on a broken screen.

**Source:** `docs/explore/revenue-trend-dashboard.md#42-admin--auth`.
**Applies Constraints:** C-001

**Execution:**
- `depends_on:` S-003
- `parallel_safe:` false
- `files:` `web/src/app/admin/login/page.tsx`, `web/src/lib/auth.ts`, `web/src/middleware.ts`, `web/src/lib/auth.test.ts`
- `autonomous:` checkpoint
- `verify:` `docker compose exec web pnpm test`

**Acceptance Scenarios:**

AS-018: Signing in leads to the editor
- **Given:** the sign-in page and a valid admin account
- **When:** the manager submits the correct email and password
- **Then:** the session is kept for later requests and the manager arrives at the week editor
- **Data:** admin@example.com / password123

AS-019: Wrong credentials keep the manager on the page
- **Given:** the sign-in page
- **When:** the manager submits a wrong password
- **Then:** "Invalid email or password" is shown on the same page, the email stays filled in, and no session is kept
- **Data:** admin@example.com / wrong

AS-020: An admin page cannot be reached without signing in
- **Given:** no session
- **When:** the admin editor address is opened directly
- **Then:** the sign-in page is shown instead, and after signing in the manager arrives at the page originally asked for
- **Data:** target `/admin/trading-days`

### S-006: Editing a week and seeing it on the dashboard (P0)

**Description:** As the venue manager, I want to edit a week's seven days in one table and then see exactly those numbers on the public dashboard, because that is the whole point of the admin area.

**Source:** `docs/explore/revenue-trend-dashboard.md#43-admin--quản-trị-dữ-liệu`; the brief's "reflect exact data that admin updated".
**Applies Constraints:** C-003, C-005

**Execution:**
- `depends_on:` S-004, S-005
- `parallel_safe:` false
- `files:` `web/src/app/admin/trading-days/page.tsx`, `web/src/components/admin/WeekEditor.tsx`, `web/src/components/admin/WeekEditor.test.tsx`, `web/src/lib/api.ts`
- `autonomous:` true
- `verify:` `docker compose exec web pnpm test`

**Acceptance Scenarios:**

AS-021: What the manager saves is what the dashboard shows — seam test
- **Given:** a signed-in manager, the running API, and Wednesday 2026-08-12 showing POS revenue 1,830 on the dashboard
- **When:** the manager changes Wednesday's POS revenue to 2,000, saves, and the dashboard is reloaded
- **Then:** Wednesday's chart column and the Total Revenue card both reflect 2,000, with the total risen by 170
- **Data:** 1830 → 2000; week total rises by 170
- **Setup:** run against a real API and database, not a stubbed one

AS-022: An invalid entry is reported and nothing is saved
- **Given:** a signed-in manager editing a week
- **When:** the manager enters -1 for Friday's labour cost and saves
- **Then:** the error is shown against that field, the week's other days are left untouched, and a failure is signalled rather than a success
- **Data:** labour_cost -1 on 2026-08-14

AS-023: A week with untraded days is still editable
- **Given:** a signed-in manager and a week where only Monday has figures
- **When:** the manager opens that week
- **Then:** all seven days are listed, the six untraded ones read zero, and any of them can be filled in and saved
- **Data:** week beginning 2026-08-10 with one row

### S-007: Export the chart as an image (P2)

**Description:** As someone reading the dashboard, I want to save the chart as a picture so I can put it in a report.

**Source:** `docs/explore/revenue-trend-dashboard.md#header` — nút `Export PNG`.

**Execution:**
- `depends_on:` S-001
- `parallel_safe:` false
- `files:` `web/src/components/dashboard/ExportPngButton.tsx`
- `autonomous:` true

**Acceptance Scenarios:**

AS-024: Exporting produces an image of what is on screen
- The visitor is looking at the chart with comparison on and Labour Costs hidden. Choosing "Export PNG" produces an image file of the chart exactly as displayed — comparison bars present, labour bars absent — and the dashboard is left as it was.

## Constraints & Invariants

C-001: Only a signed-in admin may read or change trading figures. Source invariant: none (from `docs/explore/revenue-trend-dashboard.md#42-admin--auth`).
  - scope: S-003, S-004, S-005
  - surfaces: admin trading-day list, admin trading-day save, browser admin pages
  - coverage: admin trading-day list → AS-012, AS-013, AS-026; admin trading-day save → AS-027; browser admin pages → AS-020

C-002: Total revenue is always `pos_revenue + eatclub_revenue`, computed at read time — never stored, never entered. Source invariant: ARCHITECTURE.md INV-001 (status: enforced). (AS-006, AS-015)

C-003: Nothing is cached between an admin save and a dashboard read. Source invariant: ARCHITECTURE.md INV-006 (status: enforced). (AS-021, AS-002)

C-004: Money crosses the wire as whole-AUD integers; formatting happens only in the browser. Source invariant: ARCHITECTURE.md INV-005 (status: enforced). (AS-006, AS-016)

C-005: A week is saved whole — either all seven days are recorded or none is, and the refusal names the offending field. (AS-017, AS-022)

C-006: A session lasts 24 hours from sign-in. An expired session is treated exactly as an absent one, everywhere. (AS-026)

C-007: The dashboard cannot be paged into weeks earlier than the earliest recorded trading day. (AS-025)

## Linked Fields

The dashboard stories consume the contract specified in `docs/tasks/BE-05-revenue-trend-endpoint.md`. Pinned both sides:

- `summary.*.previous` and `summary.*.delta_pct` — consumed by AS-007 / AS-009 on the summary cards (present in every response when comparison is on; absent otherwise). Produced by `BE-05:AS-002` on the same response. ✔ surface + lifecycle match.
- `series[].previous` — consumed by `FE-04:AS-003` on the chart (persisted, served on every fetch with comparison on). Produced by `BE-05:AS-002`. ✔ match.
- `series[]` always seven entries — consumed by AS-023 and `FE-04:AS-006`. Produced by `BE-05:AS-004`. ✔ match.
- `available_range.earliest` — consumed by AS-025 to disable backward navigation (present on every trend response, whatever the week asked for). Produced by BE-05, which must be extended with this field. ✔ surface + lifecycle match once BE-05 carries it.
- **Seam test:** AS-021 exercises admin save → dashboard read against a real API and database. Not mocked; a mock would hide exactly the surface/lifecycle mismatch this pin exists to catch.

## Behavior Matrix

| State | Viewer | Surface | Expected behavior | Source / timing | Cascade / parity obligations | Coverage |
|---|---|---|---|---|---|---|
| Week has figures | Visitor | Dashboard | Chart + three cards show the week | API, fetched per page load | Cards and chart read the same response — no independent totals | AS-001 |
| Week has figures, comparing | Visitor | Dashboard | Both periods shown, change signed and coloured | API with comparison on, refetched on toggle | Card change % and chart previous bars come from one response | AS-002, AS-007 |
| Previous week untraded | Visitor | Dashboard | Previous figure reads $0, no percentage | API returns no change figure | none | AS-009 |
| Any | Visitor | Admin pages | Sent to sign-in, then on to the page asked for | Session absent | none | AS-020 |
| Any | Visitor | Admin API | Refused, no data returned | Token absent or unverifiable | none | AS-012, AS-013 |
| Session older than 24h | Admin | Admin API | Refused identically to an absent token | Token expiry checked per request | Browser clears the session and returns to sign-in | AS-026 |
| Showing the earliest recorded week | Visitor | Dashboard | Move-to-earlier control unavailable | `available_range.earliest` on every trend response | none | AS-025 |
| Week partly traded | Admin | Week editor | Seven rows, untraded ones zero and editable | API list, per page load | Saving an untraded day makes it appear on the dashboard | AS-014, AS-023 |
| Week has figures | Admin | Week editor → Dashboard | Saved figures appear on next dashboard load | Database; no cache between | Chart column and Total Revenue card both move | AS-021 |
| Any | Admin | Public dashboard | Identical to what a visitor sees — no admin-only figures | API, same endpoint | none | N/A: the dashboard has no viewer-dependent behaviour; the same response serves both |

## UI Notes

- `DashboardPage` *(owns weekStart, compareMode, visibleSeries)*
  - `DashboardHeader`
    - `SeriesToggles`: three checkboxes — POS Revenue, Eatclub Revenue, Labour Costs
    - `CompareToggle` *(active state visibly distinct)*
    - `ExportPngButton` *(P2)*
    - `WeekNavigator`: previous / next week
  - `SummaryCards`
    - `SummaryCard` ×3 *(comparison line hidden when comparison is off)*
  - `RevenueTrendChart` *(reuse — spec in `docs/tasks/FE-04-revenue-trend-chart.md`)*
- `AdminLoginPage`
  - `LoginForm` *(error shown inline, email preserved)*
- `AdminWeekEditorPage`
  - `WeekPicker`
  - `WeekEditor`: seven rows × four figures *(untraded days show zero, not blank)*
  - `Toast` *(save outcome)*

## What Already Exists

### UI Inventory

| Component | Path | Reuse plan |
|---|---|---|
| API client | `web/src/lib/api.ts` | extend with the trend, sign-in and trading-day calls; keep it the only module that calls fetch |
| Root layout + metadata | `web/src/app/layout.tsx` | reuse; each new page sets its own `metadata.title` |

### System Impact & Technical Risks

- **Walking skeleton is in place and green** — models, migrations, a three-week seed, the error envelope in `api/app/controllers/api/v1/base_controller.rb`, `GET /api/v1/venues`, RSpec and Vitest. Admin controllers nest under a new `Api::V1::Admin::BaseController` that adds the guard on top of the existing envelope.
- **Recharts grouped-of-stacked layout is the one real technical risk** — carried by FE-04, mitigated by building the four-bar layout against mock data before wiring the API.
- **Server components reach the API at a different address than the browser** — `web/src/lib/api.ts` already resolves this; admin pages that fetch server-side inherit it, and any new fetch must go through that module rather than calling fetch directly.

## Not in Scope

- Event impact markers — dropped from the brief after review; nothing in the data model supports them.
- The four analysis tabs beneath the chart in the prototype (`Period Comparison`, `Year-over-Year`, `Budget Performance`, `Performance Score`) — the brief asks for one view.
- Multi-venue switching — one seeded venue is enough to demonstrate the flow.
- Admin roles beyond a single administrator — no second role appears anywhere in the brief.
- Live updates — a page reload is the stated way to see new figures.
- Mobile layout below 1024px — desktop only, per the explore doc.
- Password reset, admin user management, sign-out across devices — no trigger in the brief.

## Gaps

- **GAP-001 (status: resolved):** How far back weeks can be browsed. Resolved — backward navigation stops at the earliest recorded trading day; the trend response reports the recorded range. Became C-007 and AS-025.
- **GAP-002 (status: resolved):** Session lifetime. Resolved — 24 hours, no refresh; an expired session behaves as an absent one. Became C-006 and AS-026.
- **GAP-003 (status: resolved):** Save granularity in the week editor. Resolved — the week is saved whole in one transaction. Became C-005, and reshaped AS-015 / AS-016 / AS-017.

## Clarifications — 2026-08-16

**Week editor saves the whole week at once, not day by day.** A seven-row table with one Save button matches what the manager is looking at, and a single transaction makes "one bad figure means nothing is written" fall out of the storage layer rather than being hand-rolled as a rollback. The cost is a larger request body and no per-day draft saving — neither matters at seven rows. *If per-day autosave is ever wanted, AS-017 is the scenario that has to change first.*

**Sessions last 24 hours with no refresh token.** Long enough that a manager entering a week's figures never hits the boundary mid-task, short enough to defend if asked. A refresh-token flow is the correct production answer but adds an endpoint and its tests for no benefit inside this brief's scope. An expired session is deliberately indistinguishable from an absent one, so there is one refusal path to test rather than two.

**Backward navigation stops at the earliest recorded week rather than paging into empty ones.** Chosen over the cheaper "let it run and show zeros": zero-filled columns stretching backwards forever read as a bug, not as a boundary. The cost is that the trend response must report the recorded date range — added to BE-05 rather than given its own endpoint, so the dashboard still makes one request per view.

## Spec Sizing Notes

Stories=7 (at target). AS=27 (target 20, within the ≤30 overage range).

G1 splits producing the excess AS:
- S-003 auth: 5 AS for 5 atoms (valid credentials, wrong password, absent token, unverifiable token, expired token). Each refusal has a distinct cause; merging them would hide which guard failed.
- S-004 saving: 5 AS for 5 atoms (list a partly-traded week, replace existing days, record missing days, abandon on a bad figure, refuse an unauthenticated write). Replace and record are different write paths through the same uniqueness rule.
- S-002 cards: 4 AS for 4 atoms (no comparison, increase, decrease, no baseline). Increase and decrease differ in styling; no-baseline is the divide-by-zero path.
- S-001 controls: 6 AS for 6 atoms (default load, comparison toggle, series toggle, week change, API failure, navigation boundary).

No bloat — each AS traces to one stated atom.

## Change Log

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-16 | Initial creation | -- |
| 2026-08-16 | GAP-001/002/003 resolved; added C-005..C-007, AS-025, AS-026; S-004 reshaped to whole-week save | -- |
