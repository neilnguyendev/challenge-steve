# Revenue Trend Dashboard

A weekly revenue dashboard for a hospitality venue, with an admin area for entering the underlying figures.

- **`api/`** — Rails 7.1, API-only, PostgreSQL
- **`web/`** — Next.js 16, App Router, TypeScript, Tailwind, Recharts

Everything runs in Docker. You do not need Ruby, Node or PostgreSQL on your machine.

---

## Prerequisites

Docker 24+ with Compose v2 — nothing else.

```bash
docker compose version        # confirm
```

Don't have it? `brew install --cask docker` on macOS, or `curl -fsSL https://get.docker.com | sh` on Ubuntu/Debian.

---

## Quick start

### Development

Hot reload, test databases prepared, sample data one command away. This is the one to use for a review.

```bash
git clone git@github.com:neilnguyendev/challenge-steve.git
cd challenge-steve
cp .env.example .env
docker compose up --build -d
```

First build takes 3–5 minutes; later starts take seconds. The API container creates the database and applies migrations before the server boots — no separate migrate step to remember.

**Then load the sample data:**

```bash
docker compose exec api bundle exec rails db:seed
```

Watch it come up with `docker compose logs -f`, and stop with `docker compose down`.

Starting the app and putting data in it are two actions on purpose. Until you run the seed the dashboard says there are no figures yet; run it whenever you want the sample week back. It is safe to repeat — it updates the same rows rather than adding more.

| | URL |
|---|---|
| **Dashboard** | http://localhost:3000 |
| **Admin** | http://localhost:3000/admin/login |
| API | http://localhost:3001/api/v1/revenue_trend |

Sign in with **`admin@example.com`** / **`password123`**, change a figure, and it appears on the dashboard.

**Starting over.** `-v` is the part that matters — it deletes the database volume. Without it the data survives and you get the same state back:

```bash
docker compose down -v          # stop and throw the database away
docker compose up --build -d    # fresh database, migrated, empty
docker compose exec api bundle exec rails db:seed
```

To stop without losing anything, leave `-v` off.

### Production

Compiled images rather than mounted source, `RAILS_ENV=production`, a standalone Next build, and neither container running as root.

Same `.env` file as development — on the machine you deploy to, that is the one you create anyway. Start from the template and change what matters:

```bash
cp .env.example .env

# Now open .env and set the production values listed below.
# Build only once you have.

docker compose -f docker-compose.prod.yml up --build -d
```

**Stop the development stack first.** Both use ports 3000, 3001 and 5433, so whichever starts second fails with `port is already allocated`:

```bash
docker compose down
```

**What must change before this is safe:**

| Variable | In the template | For production |
|---|---|---|
| `POSTGRES_PASSWORD` | `revenue` | anything but that |
| `JWT_SECRET` | a placeholder saying so | `openssl rand -hex 32` |
| `SECRET_KEY_BASE` | commented out | uncomment, `openssl rand -hex 64` — Rails will not boot without it |
| `CORS_ORIGINS` | `http://localhost:3000` | the origin serving the dashboard |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | the address the **browser** reaches the API on |

The three secrets are enforced rather than trusted — the stack refuses to start without them instead of quietly falling back to a development default. `RAILS_ENV` needs no attention: the production compose file sets it regardless of what `.env` says.

Migrations run on boot here too. Seeding stays manual, and on a real deployment you would usually skip it entirely — it exists to make a review possible, not to populate a production database:

```bash
docker compose -f docker-compose.prod.yml exec api ./bin/rails db:seed
```

One thing worth knowing: `NEXT_PUBLIC_API_BASE_URL` is compiled into the browser bundle, so changing it means rebuilding rather than restarting.

#### Trying the production build locally

Rails redirects to HTTPS in production. On a laptop that points at a port nothing is serving, and the symptom is confusing: the dashboard loads normally — Next does not redirect — but every figure fails to arrive, because each API call answers `301` to an address that refuses the connection.

Turn it off and point the two URLs back at localhost:

```
FORCE_SSL=false
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

`POSTGRES_PASSWORD`, `JWT_SECRET` and `SECRET_KEY_BASE` still have to be set — the stack refuses to start otherwise — but locally any long random string will do.

```bash
docker compose down                                          # free the ports
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec api ./bin/rails db:seed
```

Leave `FORCE_SSL` alone on a real deployment. It defaults to on, which is what you want behind TLS.

One more thing if you run this stack more than once: PostgreSQL sets the password when it first creates its data directory and ignores the variable afterwards. Change `POSTGRES_PASSWORD` and the API will stop authenticating until you delete the volume — `docker compose -f docker-compose.prod.yml down -v`.

---

## What the seed gives you

One venue, **three consecutive weeks** of trading ending with the current week, and one admin.

Three weeks is deliberate: *Compare to Previous* needs a week plus the one before it, so a two-week seed would leave the comparison empty on the oldest week you can reach. Older weeks sit slightly below the current one, so the comparison shows a real change rather than a flat 0%.

---

## Environment variables

`cp .env.example .env` gives working defaults; the file is documented inline. The ones worth knowing:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Where the **browser** reaches the API — a host address, not the container name. This code runs in the user's browser, which knows nothing about the Docker network. |
| `CORS_ORIGINS` | Origins the API accepts browser calls from. Must include wherever `web` is served. |
| `JWT_SECRET` | Signs admin session tokens. `openssl rand -hex 32`. |
| `SECRET_KEY_BASE` | Production only. Rails refuses to boot without it. |

Ports default to web `3000`, API `3001`, PostgreSQL `5433` — the last moved off 5432 so a PostgreSQL already on your machine keeps working. All three are configurable in `.env`.

---

## Everyday commands

### Database

```bash
docker compose exec api bundle exec rails db:migrate    # also runs on container start
docker compose exec api bundle exec rails db:seed       # never runs on its own
docker compose exec api bundle exec rails console
docker compose exec db psql -U revenue -d revenue_db
```

### Reset the database

```bash
docker compose down -v && docker compose up --build -d
docker compose exec api bundle exec rails db:seed
```

### Logs

```bash
docker compose logs -f          # everything
docker compose logs -f api      # one service
```

### After changing dependencies

Editing `api/Gemfile` or `web/package.json` needs a rebuild — the install step is baked into the image layer:

```bash
docker compose up --build -d
```

---

## Project layout

```
.
├── docker-compose.yml       # development: db + api + web
├── docker-compose.prod.yml  # production images
├── .env.example
│
├── api/                     # Rails 7.1, API-only
│   ├── app/
│   │   ├── controllers/api/v1/   # base_controller holds the error envelope
│   │   ├── models/               # Venue, TradingDay, AdminUser
│   │   └── services/             # query objects — aggregation lives here
│   ├── db/migrate/  db/seeds.rb
│   ├── spec/                     # RSpec
│   ├── Dockerfile  Dockerfile.dev
│   └── bin/docker-dev-entrypoint
│
├── web/                     # Next.js 16
│   ├── src/
│   │   ├── app/             # routes: /, /admin/login, /admin/trading-days
│   │   ├── components/      # dashboard/ and admin/
│   │   └── lib/api.ts       # the only module that talks to the API
│   ├── e2e/                 # Playwright, runs against the containers
│   └── Dockerfile  Dockerfile.dev
│
└── docs/
```

---

## Data model

```
venues        (id, name, timezone)
trading_days  (id, venue_id, date, pos_revenue, eatclub_revenue,
               labour_cost, covers)          -- unique (venue_id, date)
admin_users   (id, email, password_digest)
```

One `trading_days` row is one venue's day of trading. Two facts worth knowing before reading the code:

**Total revenue is never stored.** It is always `pos_revenue + eatclub_revenue`, computed when the API responds. A stored total is a second source of truth that eventually disagrees with the first.

**Money is whole AUD, not cents.** The venue records takings to the dollar and every figure renders without decimals.

A missing row means the venue did not trade that day. The API returns such days zero-filled, so the chart always receives seven days and never has to guard against gaps.

---

## Documentation

| Document | What's in it |
|---|---|
| [`docs/explore/revenue-trend-dashboard.md`](docs/explore/revenue-trend-dashboard.md) | Requirements analysis, decisions made with the client, open questions, estimate |
| [`docs/tasks/`](docs/tasks/) | Two representative tickets with full acceptance criteria |
| [`docs/specs/revenue-trend-dashboard/`](docs/specs/revenue-trend-dashboard/) | The spec the build was driven from — 7 stories, 27 acceptance scenarios, 7 constraints |
| [`docs/adr/`](docs/adr/) | Why the six decisions that shape this codebase were made, and what they cost |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Codebase shape, conventions, invariants, and how to run the tests |

Read in that order — requirements, tickets, spec, decisions, architecture — and they follow how the project was actually built.
