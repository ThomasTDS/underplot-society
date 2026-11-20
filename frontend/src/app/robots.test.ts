// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

const { default: robots } = await import("./robots");

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("blocks everything on staging", async () => {
    vi.stubEnv("SITE_URL", "https://staging.underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "");
    expect(await robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("allows crawling in production and lists one sitemap per language", async () => {
    vi.stubEnv("SITE_URL", "https://underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "on");
    expect(await robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/*?unavailable=" },
      sitemap: [
        "https://underplotsociety.com.br/sitemap/en.xml",
        "https://underplotsociety.com.br/sitemap/pt-br.xml",
        "https://underplotsociety.com.br/sitemap/es.xml",
      ],
    });
  });
});
