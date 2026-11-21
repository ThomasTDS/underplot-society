// @vitest-environment node
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import { config, proxy } from "./proxy";

const ORIGIN = "http://site.test";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}${path}`, { headers });
}

describe("proxy", () => {
  it.each([
    ["/", "pt-BR,pt;q=0.9", "/pt-br"],
    ["/", "es-MX", "/es"],
    ["/", "fr-FR", "/en"],
    ["/", "", "/en"],
    ["/about", "es-AR", "/es/about"],
    ["/about?ref=x", "pt-PT", "/pt-br/about?ref=x"],
  ])("redirects %s with Accept-Language '%s' to %s", async (path, acceptLanguage, target) => {
    const response = await proxy(request(path, { "accept-language": acceptLanguage }));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}${target}`);
    expect(response.headers.get("vary")).toBe("Accept-Language, Cookie");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("uses the locale cookie before the browser languages", async () => {
    const response = await proxy(request("/", { "accept-language": "pt-BR", cookie: "locale=es" }));

    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/es`);
  });

  it.each(["/en", "/pt-br", "/es", "/es/anything"])("lets %s through", async (path) => {
    const response = await proxy(request(path, { "accept-language": "pt-BR" }));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["/PT-BR", "/pt-br"],
    ["/Es/about", "/es/about"],
    ["/EN?x=1", "/en?x=1"],
  ])("permanently redirects %s to the lower-case locale %s", async (path, target) => {
    const response = await proxy(request(path, { "accept-language": "es" }));

    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}${target}`);
  });

  it("keeps redirects on the same origin", async () => {
    const response = await proxy(request("//evil.test/path", { "accept-language": "en" }));

    expect(new URL(getRedirectUrl(response) ?? "").origin).toBe(ORIGIN);
  });
});

describe("proxy and search engines", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps pages out of search engines by header outside production", async () => {
    vi.stubEnv("SITE_URL", "https://staging.underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "");
    expect((await proxy(request("/en"))).headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("adds no robots header in production", async () => {
    vi.stubEnv("SITE_URL", "https://underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "on");
    expect((await proxy(request("/pt-br/articles"))).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("proxy and article pages", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Fakes the site's own server: the existence check and the not-found page. */
  function stubSelf(exists: Response | Error, notFoundPage: Response = new Response("<h1>Not found</h1>", { headers: { "content-type": "text/html" } })) {
    const fetchFn = vi.fn(async (input: URL | string) => {
      const url = new URL(String(input));
      if (url.pathname === "/internal/article-exists") {
        if (exists instanceof Error) throw exists;
        return exists.clone();
      }
      return notFoundPage.clone();
    });
    vi.stubGlobal("fetch", fetchFn);
    return fetchFn;
  }

  it("asks the site's own server, not the public host, whether the article exists", async () => {
    const fetchFn = stubSelf(Response.json({ exists: true }));
    const response = await proxy(request("/pt-br/articles/meu-artigo"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    const asked = new URL(String(fetchFn.mock.calls[0][0]));
    expect(asked.origin).toBe("http://127.0.0.1:3000");
    expect(asked.pathname).toBe("/internal/article-exists");
    expect(Object.fromEntries(asked.searchParams)).toEqual({ locale: "pt-br", slug: "meu-artigo" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("answers a missing article with the translated not-found page and a real 404", async () => {
    const fetchFn = stubSelf(Response.json({ exists: false }));
    const response = await proxy(request("/es/articles/no-existe"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("<h1>Not found</h1>");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new URL(String(fetchFn.mock.calls[1][0])).pathname).toBe("/es/missing");
  });

  it.each([
    ["the API cannot tell", Response.json({ exists: null }, { status: 503 })],
    ["the check fails", new Error("timeout")],
  ])("lets the page decide when %s", async (_, answer) => {
    stubSelf(answer);
    const response = await proxy(request("/en/articles/maybe"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets the page decide when the not-found page cannot be fetched", async () => {
    stubSelf(Response.json({ exists: false }), new Response("down", { status: 500 }));
    const response = await proxy(request("/en/articles/gone"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves client-side navigations and prefetches to the page", async () => {
    const fetchFn = stubSelf(Response.json({ exists: false }));
    const response = await proxy(request("/en/articles/gone", { "sec-fetch-dest": "empty" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ["a browser page load", { "sec-fetch-dest": "document" }],
    ["a crawler or tool without Fetch Metadata", {}],
  ])("still answers %s for a missing article with a 404", async (_, headers) => {
    stubSelf(Response.json({ exists: false }));
    const response = await proxy(request("/en/articles/gone", headers));
    expect(response.status).toBe(404);
  });

  it.each(["/en", "/en/articles", "/en/articles/a/b", "/en/missing"])("does not check %s", async (path) => {
    const fetchFn = stubSelf(Response.json({ exists: false }));
    await proxy(request(path));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("proxy matcher", () => {
  it.each(["/", "/about", "/pt-br", "/es/articles/some-slug"])("runs on page path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(true);
  });

  it.each(["/_next/static/chunk.js", "/favicon.ico", "/robots.txt", "/images/logo.svg", "/internal/revalidate"])(
    "skips %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(false);
    },
  );
});
