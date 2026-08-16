# Revenue Trend Dashboard

A weekly revenue dashboard for a hospitality venue, with an admin area for entering the underlying figures.

- **`api/`** — Rails 7.1, API-only, PostgreSQL
- **`web/`** — Next.js 16, App Router, TypeScript, Tailwind, Recharts

Everything runs in Docker. You do not need Ruby, Node or PostgreSQL on your machine.

---

## Prerequisites

Exactly one thing:

| | Version | Check with |
|---|---|---|
| Docker Desktop / OrbStack / Docker Engine | 24 or newer, with Compose v2 | `docker compose version` |

**Install if you don't have it:**

```bash
# macOS
brew install --cask docker        # or: brew install orbstack

# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # then log out and back in
```

Start Docker and confirm it's running:

```bash
docker info >/dev/null && echo "Docker is running"
```

---

## Quick start

Four lines from nothing to a running app:

```bash
git clone git@github.com:neilnguyendev/challenge-steve.git
cd challenge-steve
cp .env.example .env
docker compose up --build
```

No SSH key on this machine? Use HTTPS instead of the first line:

```bash
git clone https://github.com/neilnguyendev/challenge-steve.git
```

The first build takes roughly 3–5 minutes: it downloads the Ruby and Node base images, installs gems and installs pnpm packages. Later starts take seconds.

**Wait for these two lines**, which mean each service is ready:

```
api-1  | [entrypoint] preparing database ...
api-1  | * Listening on http://0.0.0.0:3000
web-1  | ✓ Ready in 2.1s
```

Then open:

| | URL |
|---|---|
| **Dashboard** | http://localhost:3000 |
| **Admin sign-in** | http://localhost:3000/admin/login |
| **Week editor** | http://localhost:3000/admin/trading-days |
| API | http://localhost:3001/api/v1/revenue_trend |
| API health check | http://localhost:3001/up |
| PostgreSQL | `localhost:5433` |

### Where the database setup happens

There is no separate migrate step to run, and that is deliberate — but it does mean the work is not visible in `docker-compose.yml`, so here is where it lives.

The `api` image's entrypoint, [`api/bin/docker-dev-entrypoint`](api/bin/docker-dev-entrypoint), runs before the server every time the container starts:

1. Waits for PostgreSQL to accept connections.
2. Runs `rails db:prepare` — creates the database if it is missing, applies any pending migrations, and loads `db/seeds.rb` **only on first creation**, so a restart never overwrites figures an admin has entered.
3. Runs `rails db:test:prepare`, so `bundle exec rspec` works straight away rather than failing on a missing test database.
4. Hands over to the server.

You can watch it happen:

```
api-1  | [entrypoint] waiting for postgres at db:5432 ...
api-1  | [entrypoint] preparing database ...
api-1  | [entrypoint] preparing test database ...
api-1  | * Listening on http://0.0.0.0:3000
```

It sits in the entrypoint rather than a compose `command:` so it also runs for `docker compose run api …` and for a plain `docker run` — anything that starts the image gets a prepared database, not just `docker compose up`.

**After adding a migration**, restarting the container is enough:

```bash
docker compose restart api          # entrypoint re-runs db:prepare
docker compose exec api bundle exec rails db:migrate   # or apply it directly
```

### Try the whole loop in a minute

1. Open the **dashboard** at http://localhost:3000 and note the Total Revenue figure.
2. Press **Compare to Previous** — the chart gains the previous week's bars and each card gains a change against it.
3. Click **Edit figures** (top right, under the controls). You are not signed in, so you land on the sign-in page; use the credentials below.
4. You arrive at the week editor you asked for. Change Wednesday's POS Revenue and press **Save week**.
5. Click **View dashboard**. Wednesday's bar and the Total Revenue card have both moved by exactly what you typed.

Step 5 is what the whole project is for, and it has a test of its own — see *Tests* below.

The admin area is reachable from the dashboard rather than only by URL, and the sign-in page remembers where you were headed, so step 3 finishes the journey instead of dropping you on a default page.

### Admin credentials

Created by the seed:

```
Email:    admin@example.com
Password: password123
```

Change them by editing `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before the first `docker compose up`, or see *Reset the database* below.

### What the admin area does

The week editor always shows seven rows, including days the venue did not trade — those read `0` rather than sitting blank, because zero is a figure the manager may need to state.

All seven days are saved **together, in one transaction**. If any figure is invalid the whole save is refused and nothing changes, so a corrected Wednesday and a mistyped Friday cannot end up half-applied.

### Stopping

```bash
docker compose down          # stop, keep the data
docker compose down -v       # stop and delete the database volume
```

---

## What the seed gives you

One venue, **three consecutive weeks** of trading data ending with the current week, and one admin user.

Three weeks is deliberate: the dashboard's *Compare to Previous* mode needs a week plus the week before it, so a two-week seed would leave the comparison empty on the oldest week you can reach.

Older weeks are seeded slightly below the current one, so the comparison shows a positive change rather than a flat 0%.

---

## Ports

Defaults chosen to avoid collisions with things you may already run. Change them in `.env`.

| Service | Container | Host | Env var |
|---|---|---|---|
| `web` | 3000 | **3000** | `WEB_PORT` |
| `api` | 3000 | **3001** | `API_PORT` |
| `db` | 5432 | **5433** | `DB_PORT` |

`DB_PORT` defaults to 5433 rather than 5432 specifically so a PostgreSQL already installed on your machine keeps working.

---

## Environment variables

`cp .env.example .env` gives you working defaults for local development; every value in it is safe to commit-free and non-secret. The file is documented inline. The ones worth knowing:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Where the **browser** reaches the API. Must be a host address (`http://localhost:3001`), not the container name — this code runs in the user's browser, which knows nothing about the Docker network. |
| `CORS_ORIGINS` | Comma-separated origins the API accepts browser calls from. Must include wherever `web` is served. |
| `JWT_SECRET` | Signs admin session tokens. Generate a real one with `openssl rand -hex 32`. |
| `DATABASE_URL` | Assembled by `docker-compose.yml` from the `POSTGRES_*` values. Set it yourself only when running outside Docker. |

---

## Everyday commands

All of these run against the running containers.

### Tests

```bash
docker compose exec api bundle exec rspec      # backend  — 38 examples
docker compose exec web pnpm test              # frontend — 102 tests
```

To run a single file or example:

```bash
docker compose exec api bundle exec rspec spec/models/trading_day_spec.rb
docker compose exec api bundle exec rspec spec/models/trading_day_spec.rb:12
docker compose exec web pnpm exec vitest run src/lib/api.test.ts
```

**The one that matters most.** `api/spec/requests/seam_admin_to_dashboard_spec.rb` signs in for a real token, saves a week through the admin endpoint, and reads it back through the public one — against the real database, with nothing stubbed at either end:

```bash
docker compose exec api bundle exec rspec spec/requests/seam_admin_to_dashboard_spec.rb
```

A mocked version of that test would pass while the two halves disagreed about which field appears on which response, which is the only failure it exists to catch.

### Browser tests (Playwright)

These drive a real Chromium against the running containers, so **start the stack first**. They run from the host rather than inside a container, to avoid shipping browser binaries in the image.

```bash
cd web
npm install -g pnpm            # if you do not have it
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e
```

Twelve checks: getting into the admin area from the dashboard, the sign-in guard, the wrong-password path, the admin-to-dashboard round trip in a real browser, and a layout regression guard that asserts the page does not change width when comparison is switched on.

```bash
pnpm exec playwright test e2e/admin.spec.ts    # one file
pnpm exec playwright test --headed             # watch it happen
pnpm exec playwright test --ui                 # step through interactively
```

### Database

```bash
# Apply new migrations (also runs automatically on container start)
docker compose exec api bundle exec rails db:migrate

# Re-run the seed
docker compose exec api bundle exec rails db:seed

# Rails console
docker compose exec api bundle exec rails console

# psql
docker compose exec db psql -U revenue -d revenue_development
```

### Reset the database

Wipes everything and rebuilds from migrations plus seed:

```bash
docker compose down -v
docker compose up --build
```

### Logs

```bash
docker compose logs -f          # everything
docker compose logs -f api      # one service
```

### After changing dependencies

Editing `api/Gemfile` or `web/package.json` needs a rebuild — the install step is baked into the image layer:

```bash
docker compose up --build
```

---

## Project layout

```
.
├── docker-compose.yml       # db + api + web
├── .env.example             # copy to .env
│
├── api/                     # Rails 7.1, API-only
│   ├── app/
│   │   ├── controllers/api/v1/
│   │   │   ├── base_controller.rb    # shared error envelope
│   │   │   └── venues_controller.rb
│   │   ├── models/          # Venue, TradingDay, AdminUser
│   │   └── services/        # query objects (aggregation lives here)
│   ├── db/
│   │   ├── migrate/
│   │   └── seeds.rb
│   ├── spec/                # RSpec
│   ├── Dockerfile.dev
│   └── bin/docker-dev-entrypoint
│
├── web/                     # Next.js 16
│   ├── src/
│   │   ├── app/             # routes: /, /admin/login, /admin/trading-days
│   │   ├── components/
│   │   │   ├── dashboard/   # chart, summary cards, header controls
│   │   │   └── admin/       # sign-in form, guard, week editor
│   │   └── lib/api.ts       # the only place that talks to the API
│   ├── e2e/                 # Playwright, runs against the containers
│   ├── vitest.config.mts
│   ├── playwright.config.ts
│   └── Dockerfile.dev
│
└── docs/
    ├── explore/             # requirements analysis, open questions
    └── tasks/               # per-ticket specs with acceptance criteria
```

---

## Data model

```
venues        (id, name, timezone)
trading_days  (id, venue_id, date, pos_revenue, eatclub_revenue,
               labour_cost, covers)          -- unique (venue_id, date)
admin_users   (id, email, password_digest)
```

One `trading_days` row is one venue's day of trading. Two facts about it are worth knowing before you read the code:

**Total revenue is never stored.** It is always `pos_revenue + eatclub_revenue`, computed when the API responds. A stored total is a second source of truth that eventually disagrees with the first.

**Money is whole AUD, not cents.** The venue records takings to the dollar and every figure on the dashboard renders without decimals. If sub-dollar precision is ever needed, `db/migrate/20260816000002_create_trading_days.rb` is the place to revisit.

A missing row means the venue did not trade that day. The API returns such days zero-filled, so the chart always receives seven days and never has to guard against gaps.

---

## A deliberate difference from the prototype

The prototype labels the previous-period bars **`Direct Revenue (Previous)`** and **`Total Revenue (Previous)`**, while labelling the current-period bars `POS Revenue` and `Eatclub Revenue`.

Those are inconsistent with each other. Per the client: `POS = Direct`, and `POS + Eatclub = Total`. So the upper segment of the previous-period bar is **Eatclub revenue**, not total revenue — the prototype names it after the running total instead of after the segment.

This implementation uses symmetrical labels across both periods:

| Prototype | Here |
|---|---|
| `Direct Revenue (Previous)` | `POS Revenue (Previous)` |
| `Total Revenue (Previous)` | `Eatclub Revenue (Previous)` |

Confirmed with the client before implementing. Full reasoning in [`docs/explore/revenue-trend-dashboard.md`](docs/explore/revenue-trend-dashboard.md).

---

## Running without Docker

Only worth it if you want a faster edit-reload loop. You will need Ruby 3.2.2, Node 22.12+ and PostgreSQL 15 installed yourself.

```bash
# 1. Database — start just the db container and use it from the host
docker compose up -d db

# 2. API
cd api
bundle install
export DATABASE_URL=postgres://revenue:revenue@localhost:5433/revenue_development
bundle exec rails db:prepare
bundle exec rails server -p 3001

# 3. Frontend, in another terminal
cd web
nvm use                      # reads .nvmrc → Node 24
npm install -g pnpm          # any pnpm 10.x; it self-adjusts to packageManager
pnpm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001" > .env.local
pnpm dev
```

**Node 22.12 or newer is required**, not merely recommended: the test environment (jsdom 27) calls `require()` on ES modules, which earlier versions cannot do.

---

## Troubleshooting

**`bind: address already in use`**

Something already holds the port. Either stop it, or change `WEB_PORT` / `API_PORT` / `DB_PORT` in `.env` and run `docker compose up` again.

```bash
lsof -i :3000        # find what is holding it (macOS/Linux)
```

**The dashboard loads but says "Could not reach the API"**

The browser, not the container, makes that call. Check that `NEXT_PUBLIC_API_BASE_URL` in `.env` points at a **host** address (`http://localhost:3001`) and not at `http://api:3000`. `NEXT_PUBLIC_*` values are baked in when the frontend starts, so restart `web` after changing them:

```bash
docker compose restart web
```

**CORS errors in the browser console**

`CORS_ORIGINS` must contain the exact origin serving the frontend, including scheme and port. If you changed `WEB_PORT`, update `CORS_ORIGINS` to match, then `docker compose restart api`.

**`PG::ConnectionBad` on startup**

The API waits for PostgreSQL, so this usually means the database volume is in a bad state. Rebuild it:

```bash
docker compose down -v && docker compose up --build
```

**Changes to `Gemfile` or `package.json` seem to be ignored**

Dependencies are installed into the image, not the mounted source. Rebuild: `docker compose up --build`.

**API returns 403 to the frontend but works fine in `curl`**

Rails' host authorisation. Server-rendered pages call the API as `http://api:3000`, so the request arrives with `Host: api`, which Rails rejects in development unless allowed. `ALLOWED_HOSTS` (default `api`) covers this. If you renamed the `api` service in `docker-compose.yml`, add the new name:

```bash
ALLOWED_HOSTS=api,my-new-name docker compose up
```

**Build fails on `pg` native extension**

The image installs `build-essential` and `libpq-dev` for exactly this. A failure here almost always means a partial build cache — clear it:

```bash
docker compose build --no-cache api
```

---

## Documentation

| Document | What's in it |
|---|---|
| [`docs/explore/revenue-trend-dashboard.md`](docs/explore/revenue-trend-dashboard.md) | Requirements analysis, decisions made with the client, open questions, estimate |
| [`docs/tasks/BE-05-revenue-trend-endpoint.md`](docs/tasks/BE-05-revenue-trend-endpoint.md) | API contract and acceptance criteria for the aggregation endpoint |
| [`docs/tasks/FE-04-revenue-trend-chart.md`](docs/tasks/FE-04-revenue-trend-chart.md) | Chart component spec and acceptance criteria |
| [`docs/specs/revenue-trend-dashboard/`](docs/specs/revenue-trend-dashboard/) | The feature spec the build was driven from — 7 stories, 27 acceptance scenarios, 7 constraints |
| [`docs/adr/`](docs/adr/) | Why the six decisions that shape this codebase were made, and what they cost |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Codebase shape, conventions, invariants |

Reading them in that order — requirements, tickets, spec, decisions, architecture — follows how the project was actually built.

### One deliberate difference from the brief

The chart legend does not use the prototype's previous-period labels. The prototype names them `Direct Revenue` and `Total Revenue` while naming the current period `POS Revenue` and `Eatclub Revenue` — two different naming schemes in one legend, where the second one labels a segment after a running total. Confirmed with the client, then changed. [ADR-0006](docs/adr/0006-symmetrical-chart-labels.md) has the reasoning.
