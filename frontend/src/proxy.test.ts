// @vitest-environment node
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
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
  ])("redirects %s with Accept-Language '%s' to %s", (path, acceptLanguage, target) => {
    const response = proxy(request(path, { "accept-language": acceptLanguage }));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}${target}`);
    expect(response.headers.get("vary")).toBe("Accept-Language, Cookie");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("uses the locale cookie before the browser languages", () => {
    const response = proxy(request("/", { "accept-language": "pt-BR", cookie: "locale=es" }));

    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/es`);
  });

  it.each(["/en", "/pt-br", "/es", "/es/anything"])("lets %s through", (path) => {
    const response = proxy(request(path, { "accept-language": "pt-BR" }));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["/PT-BR", "/pt-br"],
    ["/Es/about", "/es/about"],
    ["/EN?x=1", "/en?x=1"],
  ])("permanently redirects %s to the lower-case locale %s", (path, target) => {
    const response = proxy(request(path, { "accept-language": "es" }));

    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}${target}`);
  });

  it("keeps redirects on the same origin", () => {
    const response = proxy(request("//evil.test/path", { "accept-language": "en" }));

    expect(new URL(getRedirectUrl(response) ?? "").origin).toBe(ORIGIN);
  });
});

describe("proxy matcher", () => {
  it.each(["/", "/about", "/pt-br", "/es/articles/some-slug"])("runs on page path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(true);
  });

  it.each(["/_next/static/chunk.js", "/favicon.ico", "/robots.txt", "/images/logo.svg"])(
    "skips %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(false);
    },
  );
});
