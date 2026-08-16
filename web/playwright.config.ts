import { defineConfig, devices } from "@playwright/test";

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
