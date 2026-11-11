import { expect, test } from "@playwright/test";
import { HealthApi } from "../../api/HealthApi";

/** The site gives up on the API after 5 seconds, so a 503 must come sooner. */
const SITE_TIMEOUT_MS = 5_000;

test.describe("GET /api/health", () => {
  test("answers 200 with the exact ok body when the database is up", async ({ request }) => {
    const response = await new HealthApi(request).check();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/json");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toStrictEqual({ status: "ok" });
  });

  test("does not advertise the server software", async ({ request }) => {
    const response = await new HealthApi(request).check();
    const headers = response.headers();

    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["server"]).toBeUndefined();
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
    test(`rejects ${method} with a generic 405`, async ({ request }) => {
      const response = await new HealthApi(request).send(method);

      expect(response.status()).toBe(405);
      expect(response.headers()["allow"]).toBe("GET, HEAD");
      expect(await response.json()).toStrictEqual({ message: "Method Not Allowed" });
    });
  }

  test(
    "answers a generic 503 quickly when the database is down",
    { tag: "@db-down" },
    async ({ request }) => {
      const { response, elapsedMs } = await new HealthApi(request).timedCheck();

      expect(
        response.status(),
        "Expected 503. Run this test through `npm run test:db-down`, which stops the database first.",
      ).toBe(503);
      expect(response.headers()["content-type"]).toBe("application/json");
      expect(response.headers()["cache-control"]).toContain("no-store");

      const body = await response.text();
      expect(JSON.parse(body)).toStrictEqual({ status: "error", error: "database_unavailable" });
      for (const detail of ["SQLSTATE", "pgsql", "db", "5432", "Exception", "/app/"]) {
        expect(body, `the 503 body must not mention "${detail}"`).not.toContain(detail);
      }

      expect(elapsedMs, `answered in ${Math.round(elapsedMs)} ms`).toBeLessThan(SITE_TIMEOUT_MS);
    },
  );
});
