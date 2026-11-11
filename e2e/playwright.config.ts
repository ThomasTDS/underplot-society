import { defineConfig, devices } from "@playwright/test";

/** The site under test. The stack must already be running (`docker compose up`). */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

/** The backend API under test. */
export const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

/**
 * Tests tagged @db-down need the database stopped. They only run through
 * `npm run test:db-down`, which stops it first and starts it again afterwards.
 */
const DB_DOWN = /@db-down/;
const dbDownRun = process.env.E2E_DB_DOWN === "1";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: dbDownRun
    ? [{ name: "api-db-down", testDir: "./tests/api", grep: DB_DOWN, use: { baseURL: API_URL } }]
    : [
        { name: "api", testDir: "./tests/api", grepInvert: DB_DOWN, use: { baseURL: API_URL } },
        {
          name: "chromium",
          testDir: "./tests/ui",
          grepInvert: DB_DOWN,
          use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
        },
      ],
});
