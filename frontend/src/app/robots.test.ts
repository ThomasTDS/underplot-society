// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_CRAWLERS_DISALLOWED, aiCrawlers } from "@/seo/ai-crawlers";

vi.mock("next/server", () => ({ connection: async () => {} }));

const { default: robots } = await import("./robots");

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("blocks everything on staging", async () => {
    vi.stubEnv("SITE_URL", "https://staging.underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "");
    expect(await robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("allows crawling in production, except AI training and agents, and lists one sitemap per language", async () => {
    vi.stubEnv("SITE_URL", "https://underplotsociety.com.br");
    vi.stubEnv("SITE_INDEXING", "on");
    expect(await robots()).toEqual({
      rules: [
        { userAgent: AI_CRAWLERS_DISALLOWED, disallow: "/" },
        { userAgent: "*", allow: "/", disallow: "/*?unavailable=" },
      ],
      sitemap: [
        "https://underplotsociety.com.br/sitemap/en.xml",
        "https://underplotsociety.com.br/sitemap/pt-br.xml",
        "https://underplotsociety.com.br/sitemap/es.xml",
      ],
    });
  });
});

describe("the AI crawler list", () => {
  const all = [...aiCrawlers.training, ...aiCrawlers.agents, ...aiCrawlers.robotsOnly, ...aiCrawlers.allowed];

  it("disallows every training crawler, agent and opt-out token", () => {
    expect(AI_CRAWLERS_DISALLOWED).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"]));
    expect(AI_CRAWLERS_DISALLOWED).toHaveLength(
      aiCrawlers.training.length + aiCrawlers.agents.length + aiCrawlers.robotsOnly.length,
    );
  });

  it("never disallows a search crawler", () => {
    for (const name of aiCrawlers.allowed) expect(AI_CRAWLERS_DISALLOWED).not.toContain(name);
  });

  it("has no name twice, and none that would also match a search crawler", () => {
    const lower = all.map((n) => n.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
    // The edge matches by substring: a blocked name inside an allowed one would block it.
    for (const blocked of [...aiCrawlers.training, ...aiCrawlers.agents]) {
      for (const allowed of aiCrawlers.allowed) {
        expect(allowed.toLowerCase(), `${blocked} inside ${allowed}`).not.toContain(blocked.toLowerCase());
      }
    }
  });

  it("uses only characters that are safe in a robots.txt line and a WAF expression", () => {
    for (const name of all) expect(name).toMatch(/^[A-Za-z0-9-]+$/);
  });
});
