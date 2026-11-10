import { BASE_URL } from "./playwright.config";

/**
 * Stop early, with a clear message, when the site is not running at all,
 * instead of letting every test time out on its own.
 */
export default async function globalSetup() {
  try {
    await fetch(BASE_URL, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error(
      [
        `The site is not reachable at ${BASE_URL}.`,
        "Start the stack first, from the repository root: docker compose up --build",
        "Or point the tests elsewhere with E2E_BASE_URL.",
      ].join("\n"),
    );
  }
}
