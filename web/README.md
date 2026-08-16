# web

Next.js frontend for the Revenue Trend Dashboard.

Setup, environment variables and how to run everything are in the [root README](../README.md) — this package is not meant to be started on its own.

```bash
pnpm test         # vitest
pnpm build
pnpm typecheck    # tsc --noEmit — run `pnpm build` once first, Next generates route types
```

Conventions:

- **pnpm**, version named by `packageManager` in `package.json`. Any pnpm 10.x works — it reads that field and switches itself to match. `npm install` here produces a lockfile that does not match the one the Docker image builds from.
- `src/lib/api.ts` is the only module that calls `fetch`. Everything else goes through it.
- Tests sit beside the code they cover as `*.test.ts(x)`. One suffix — never mix `.test` and `.spec`.
- Requires Node 22.12+ (`.nvmrc` pins 24): jsdom 27 calls `require()` on ES modules.
- New dependencies with install scripts must be listed under `pnpm.onlyBuiltDependencies` — pnpm blocks them by default, and the failure is silent until something breaks at runtime.
