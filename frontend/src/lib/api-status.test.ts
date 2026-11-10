// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getApiStatus, healthUrl } from "./api-status";

const BASE = "http://api.test:8000";

function respondWith(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("getApiStatus", () => {
  it("is operational when the API answers 200 with status ok", async () => {
    const fetchFn = respondWith(200, { status: "ok" });

    await expect(getApiStatus(BASE, { fetchFn })).resolves.toBe("operational");

    const [url, init] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("http://api.test:8000/api/health");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("is degraded when the API answers 503 with its error body", async () => {
    const fetchFn = respondWith(503, { status: "error", error: "database_unavailable" });

    await expect(getApiStatus(BASE, { fetchFn })).resolves.toBe("degraded");
  });

  it.each([
    ["a 500", 500, { message: "Server Error" }],
    ["a 404", 404, { message: "Not Found" }],
    ["a 503 from something other than the API", 503, "<html>Service Unavailable</html>"],
    ["a 200 with an unexpected status", 200, { status: "maybe" }],
    ["a 200 with an empty object", 200, {}],
    ["a 200 with a JSON array", 200, ["ok"]],
    ["a 200 with invalid JSON", 200, "{not json"],
    ["a 200 with an HTML page", 200, "<html>ok</html>"],
  ])("is unreachable on %s", async (_case, status, body) => {
    await expect(getApiStatus(BASE, { fetchFn: respondWith(status, body) })).resolves.toBe(
      "unreachable",
    );
  });

  it("is unreachable when the request fails at the network level", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(getApiStatus(BASE, { fetchFn })).resolves.toBe("unreachable");
  });

  it("is unreachable when the API does not answer within the timeout", async () => {
    // Never answers; only gives up when the request is aborted.
    const fetchFn = vi.fn(
      (_url: URL, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );

    const start = Date.now();
    await expect(getApiStatus(BASE, { fetchFn, timeoutMs: 50 })).resolves.toBe("unreachable");
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
    ["not a URL", "api.test:8000"],
    ["a non-http scheme", "file:///etc/passwd"],
  ])("is unreachable without calling the network when the base URL is %s", async (_case, base) => {
    const fetchFn = respondWith(200, { status: "ok" });

    await expect(getApiStatus(base, { fetchFn })).resolves.toBe("unreachable");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("healthUrl", () => {
  it.each([
    ["http://api.test:8000", "http://api.test:8000/api/health"],
    ["http://api.test:8000/", "http://api.test:8000/api/health"],
    ["https://api.example.com", "https://api.example.com/api/health"],
    ["  http://api.test  ", "http://api.test/api/health"],
  ])("builds the health URL from %s", (base, expected) => {
    expect(healthUrl(base)?.toString()).toBe(expected);
  });
});
