import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { API_URL, BASE_URL } from "./playwright.config";

const REPO_ROOT = join(__dirname, "..");

/**
 * Stop early, with a clear message, when the site or the API is not running
 * at all, instead of letting every test time out on its own.
 */
export default async function globalSetup() {
  const targets = [
    { name: "site", url: BASE_URL, variable: "E2E_BASE_URL" },
    { name: "API", url: `${API_URL}/api/health`, variable: "E2E_API_URL" },
  ];

  for (const { name, url, variable } of targets) {
    try {
      // Any HTTP answer will do (a 503 still means the API is running).
      await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new Error(
        [
          `The ${name} is not reachable at ${url}.`,
          "Start the stack first, from the repository root: docker compose up --build",
          `Or point the tests elsewhere with ${variable}.`,
        ].join("\n"),
      );
    }
  }

  seedContent();
}

/**
 * Sample articles and the XSS probe, in the local Docker stack. Safe to run again.
 * Skipped for the database-down run, and with E2E_SEED=0 (for example, when the
 * tests point at another environment).
 */
function seedContent() {
  if (process.env.E2E_DB_DOWN === "1" || process.env.E2E_SEED === "0") return;

  for (const seeder of ["SampleContentSeeder", "XssProbeSeeder"]) {
    execFileSync(
      "docker",
      ["compose", "exec", "-T", "backend", "php", "artisan", "db:seed", `--class=${seeder}`, "--force", "--no-interaction"],
      { cwd: REPO_ROOT, stdio: "inherit" },
    );
  }
}
