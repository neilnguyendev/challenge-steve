# 5. Docker as the only prerequisite

**Status:** Accepted · 2026-08-16

## Context

The brief asks for setup instructions that work on a fresh Linux or macOS machine with nothing installed, including database initialisation and migrations.

Installing Ruby 3.2.2, Node 24 and PostgreSQL 15 by hand is where those instructions usually fail: version managers differ, the `pg` gem needs `libpq` headers, and a PostgreSQL already listening on 5432 collides silently.

## Decision

`docker compose up --build` is the supported path. Three services — `db`, `api`, `web`. The README lists Docker as the single prerequisite.

The database is created, migrated and seeded by the API container's entrypoint via `rails db:prepare`, so there is no separate setup step to forget.

Running without Docker stays documented, but as the secondary path.

## Consequences

- The setup instructions are three commands, and they are the same on both operating systems.
- Version drift between machines disappears. The Ruby and Node versions are in the Dockerfiles, not in a reader's shell.
- `DB_PORT` defaults to 5433 rather than 5432 so an existing local PostgreSQL keeps working.
- Cost: the first build takes 3–5 minutes, and a dependency change needs `--build` rather than just an install. Both are called out in the README.
- Cost: file-watching through a bind mount is slower than native. Acceptable for this size of project; the native path is documented for anyone who minds.
