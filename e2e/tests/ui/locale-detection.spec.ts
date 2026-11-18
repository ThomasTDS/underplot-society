import { expect, test } from "@playwright/test";
import { messages } from "../../support/locales";

/**
 * Where a request without a locale prefix lands: the locale cookie first, then the
 * browser's Accept-Language in order of preference, then English. Checked against
 * the running site, redirects not followed.
 */

const matrix: [acceptLanguage: string | null, expected: string][] = [
  // Each language and its variants.
  ["pt-BR,pt;q=0.9,en;q=0.8", "pt-br"],
  ["pt-PT", "pt-br"],
  ["pt", "pt-br"],
  ["es-AR,es;q=0.9", "es"],
  ["es-419", "es"],
  ["en-US,en;q=0.9", "en"],
  ["en-GB", "en"],
  // Order of preference, by q and then by position.
  ["fr-FR,fr;q=0.9,es;q=0.8,pt;q=0.5", "es"],
  ["de;q=1, pt;q=0.9, en;q=0.8", "pt-br"],
  ["en;q=0.5, es;q=0.7", "es"],
  ["es, pt", "es"],
  // q=0 means "not acceptable".
  ["pt;q=0, es", "es"],
  // Nothing usable: English.
  ["fr-FR,de;q=0.9", "en"],
  ["*", "en"],
  ["", "en"],
  [null, "en"],
  ["pt;q=abc", "en"],
  ["%%%,;;;", "en"],
];

for (const [acceptLanguage, expected] of matrix) {
  test(`Accept-Language ${JSON.stringify(acceptLanguage)} goes to /${expected}`, async ({ request }) => {
    const response = await request.get("/", {
      maxRedirects: 0,
      headers: acceptLanguage === null ? {} : { "Accept-Language": acceptLanguage },
    });

    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location!, "http://x").pathname).toBe(`/${expected}`);
    expect(response.headers().vary).toMatch(/Accept-Language/i);
  });
}

test.describe("the reader's choice", () => {
  for (const [cookie, acceptLanguage, expected] of [
    ["es", "pt-BR,pt;q=0.9", "es"],
    ["en", "es-ES", "en"],
    ["pt-br", "", "pt-br"],
    ["xx", "es", "es"], // An invalid cookie is ignored.
    ["PT-BR", "es", "es"],
  ] as const) {
    test(`cookie ${cookie} with Accept-Language "${acceptLanguage}" goes to /${expected}`, async ({ request }) => {
      const response = await request.get("/", {
        maxRedirects: 0,
        headers: { "Accept-Language": acceptLanguage, Cookie: `locale=${cookie}` },
      });
      expect(new URL(response.headers().location!, "http://x").pathname).toBe(`/${expected}`);
      expect(response.headers().vary).toMatch(/Cookie/i);
    });
  }
});

test.describe("paths", () => {
  test("a deep path keeps its path and query", async ({ request }) => {
    const response = await request.get("/articles?area=culture", {
      maxRedirects: 0,
      headers: { "Accept-Language": "es" },
    });
    const location = new URL(response.headers().location!, "http://x");
    expect(`${location.pathname}${location.search}`).toBe("/es/articles?area=culture");
  });

  test("a locale in the wrong case gets a permanent redirect", async ({ request }) => {
    const response = await request.get("/PT-BR/articles", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location!, "http://x").pathname).toBe("/pt-br/articles");
  });

  test("a prefixed path is served as is, whatever the browser prefers", async ({ request }) => {
    const response = await request.get("/es", { maxRedirects: 0, headers: { "Accept-Language": "pt-BR" } });
    expect(response.status()).toBe(200);
  });
});

test.describe("language fallback", () => {
  test("an article missing in a language sends the reader to that language's list, with a notice", async ({ page }) => {
    await page.goto("/en/articles/partial-probe");
    const switcher = page.getByRole("navigation", { name: messages.en.language.label });

    await expect(switcher.getByRole("link", { name: "Português" })).toHaveAttribute("href", "/pt-br/articles/sonda-parcial");
    await switcher.getByRole("link", { name: "Español" }).click();

    await expect(page).toHaveURL("/es/articles?unavailable=article");
    await expect(page.getByRole("status").filter({ hasText: messages.es.articles.notInLanguage })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("the notice appears only when the reader comes from a missing article", async ({ page }) => {
    await page.goto("/es/articles");
    await expect(page.getByText(messages.es.articles.notInLanguage)).toHaveCount(0);
  });
});
