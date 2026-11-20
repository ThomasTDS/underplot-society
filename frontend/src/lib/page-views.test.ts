// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { countablePath, isPerson, recordPageView } from "./page-views";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SECRET = "a-shared-secret-of-at-least-32-characters";

const headers = (values: Record<string, string>) => new Headers(values);
const page = (extra: Record<string, string> = {}) => headers({ "user-agent": CHROME, ...extra });

describe("countablePath", () => {
  it.each([
    ["/en", "/en"],
    ["/pt-br/", "/pt-br"],
    ["/es/articles", "/es/articles"],
    ["/en/articles/sample-reading-the-fine-print", "/en/articles/sample-reading-the-fine-print"],
    ["/pt-br/about", "/pt-br/about"],
    ["/es/privacy", "/es/privacy"],
    ["/en/accessibility/", "/en/accessibility"],
  ])("counts %s as %s", (path, expected) => {
    expect(countablePath(path)).toBe(expected);
  });

  it.each(["/", "/fr", "/en/missing", "/en/admin", "/en/articles/a/b", "/en/articles/Upper", `/en/articles/${"a".repeat(200)}`])(
    "ignores %s",
    (path) => {
      expect(countablePath(path)).toBeNull();
    },
  );
});

describe("isPerson", () => {
  it("accepts a browser", () => {
    expect(isPerson(headers({ "user-agent": CHROME }))).toBe(true);
  });

  it.each([
    ["a browser prefetch", { "sec-purpose": "prefetch" }],
    ["a prerender", { "sec-purpose": "prefetch;prerender" }],
    ["an old-style prefetch", { purpose: "prefetch" }],
  ])("refuses %s", (_, extra) => {
    expect(isPerson(page(extra))).toBe(false);
  });

  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
    "facebookexternalhit/1.1",
    "curl/8.9.1",
    "python-requests/2.32",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
    "UptimeRobot/2.0 (monitor)",
    "",
  ])("refuses bots and scripts: %s", (userAgent) => {
    expect(isPerson(page({ "user-agent": userAgent }))).toBe(false);
  });
});

describe("recordPageView", () => {
  it("posts only the page to the API's internal endpoint, with the shared secret", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await recordPageView("/es/about", { baseUrl: "http://backend:8000", secret: SECRET, fetchFn });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toBe("http://backend:8000/api/internal/page-views");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(String(init?.body))).toEqual({ path: "/es/about" });
  });

  it("is off without the API address or a strong secret", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    await recordPageView("/en", { baseUrl: undefined, secret: SECRET, fetchFn });
    await recordPageView("/en", { baseUrl: "http://backend:8000", secret: undefined, fetchFn });
    await recordPageView("/en", { baseUrl: "http://backend:8000", secret: "short", fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never throws when the API is down", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(recordPageView("/en", { baseUrl: "http://backend:8000", secret: SECRET, fetchFn })).resolves.toBeUndefined();
  });
});
