import { readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * The browser tests sign in with the account the seed created, and the seed
 * takes its credentials from the project's .env. Playwright runs on the host,
 * where nothing has loaded that file — so without this it falls back to the
 * defaults and fails against any machine whose .env differs, which reads as a
 * broken sign-in rather than a test looking at the wrong password.
 */
function loadProjectEnv() {
  try {
    for (const line of readFileSync("../.env", "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, raw] = match;
      // Existing environment wins, so a one-off override still works.
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env — compose defaults apply, and so do the fallbacks below.
  }
}

loadProjectEnv();

/**
 * Runs against the stack started by `docker compose up`. Playwright does not
 * start the app itself: these tests are meant to exercise the real containers,
 * including the Rails API and Postgres, not a stubbed frontend.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
