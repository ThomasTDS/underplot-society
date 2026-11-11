import { API_URL, BASE_URL } from "./playwright.config";

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
}
