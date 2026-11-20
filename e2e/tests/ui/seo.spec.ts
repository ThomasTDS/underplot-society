import { expect, test, type Page } from "@playwright/test";
import { BASE_URL } from "../../playwright.config";
import { htmlLang, locales, messages } from "../../support/locales";

/**
 * SEO tags as the local stack serves them. Browsers get the metadata streamed into
 * the body; crawlers (by user agent) get it in <head> before anything else, which
 * the last test checks. Locally the site runs as production does
 * (SITE_INDEXING=on); staging's "never index" mode is covered by unit tests.
 */

const ORIGIN = new URL(BASE_URL).origin;
const abs = (path: string) => `${ORIGIN}${path}`;
const OG_LOCALE = { en: "en_US", "pt-br": "pt_BR", es: "es_ES" } as const;

const articleSlugs = {
  en: "sample-reading-the-fine-print",
  "pt-br": "exemplo-lendo-as-letras-miudas",
  es: "ejemplo-leyendo-la-letra-pequena",
} as const;

async function hreflangs(page: Page) {
  const links = page.locator('link[rel="alternate"][hreflang]');
  const entries = await links.evaluateAll((els) => els.map((el) => [el.getAttribute("hreflang"), el.getAttribute("href")]));
  return Object.fromEntries(entries);
}

const canonical = (page: Page) => page.locator('link[rel="canonical"]');
const meta = (page: Page, key: string) => page.locator(`meta[name="${key}"], meta[property="${key}"]`).first();

for (const locale of locales) {
  test.describe(`SEO (${locale})`, () => {
    test("the home page has its title, canonical, hreflang and share tags", async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page).toHaveTitle(`Underplot Society: ${messages[locale].home.tagline}`);
      await expect(canonical(page)).toHaveAttribute("href", abs(`/${locale}`));
      expect(await hreflangs(page)).toEqual({
        en: abs("/en"),
        "pt-BR": abs("/pt-br"),
        es: abs("/es"),
        "x-default": ORIGIN,
      });
      await expect(meta(page, "robots")).toHaveAttribute("content", "index, follow");
      await expect(meta(page, "og:locale")).toHaveAttribute("content", OG_LOCALE[locale]);
      await expect(meta(page, "og:image")).toHaveAttribute("content", abs("/og-default.png"));
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang[locale]);
    });

    test("the article list is canonical without filters, and a filtered list is its own page", async ({ page }) => {
      await page.goto(`/${locale}/articles`);
      await expect(page).toHaveTitle(`${messages[locale].articles.heading} · Underplot Society`);
      await expect(canonical(page)).toHaveAttribute("href", abs(`/${locale}/articles`));
      expect(Object.keys(await hreflangs(page))).toEqual(["en", "pt-BR", "es", "x-default"]);

      await page.goto(`/${locale}/articles?unavailable=article`);
      await expect(canonical(page)).toHaveAttribute("href", abs(`/${locale}/articles`));
    });

    test("an article points to itself and to its own slug in each language", async ({ page }) => {
      await page.goto(`/${locale}/articles/${articleSlugs[locale]}`);

      await expect(canonical(page)).toHaveAttribute("href", abs(`/${locale}/articles/${articleSlugs[locale]}`));
      expect(await hreflangs(page)).toEqual({
        en: abs(`/en/articles/${articleSlugs.en}`),
        "pt-BR": abs(`/pt-br/articles/${articleSlugs["pt-br"]}`),
        es: abs(`/es/articles/${articleSlugs.es}`),
        "x-default": abs(`/en/articles/${articleSlugs.en}`),
      });
      await expect(meta(page, "og:type")).toHaveAttribute("content", "article");
      await expect(meta(page, "article:published_time")).toHaveAttribute("content", /^\d{4}-\d{2}-\d{2}T/);
      await expect(meta(page, "description")).toHaveAttribute("content", /.+/);
    });

    test("the sitemap lists the language's pages and articles", async ({ request }) => {
      const response = await request.get(`/sitemap/${locale}.xml`);
      expect(response.status()).toBe(200);
      const xml = await response.text();

      for (const path of [
        `/${locale}`,
        `/${locale}/articles`,
        `/${locale}/articles/${articleSlugs[locale]}`,
        `/${locale}/about`,
        `/${locale}/privacy`,
        `/${locale}/accessibility`,
      ]) {
        expect(xml).toContain(`<loc>${abs(path)}</loc>`);
      }
      // Only this language's pages are listed (others only as alternates).
      const other = locales.find((l) => l !== locale)!;
      expect(xml).not.toContain(`<loc>${abs(`/${other}/articles/${articleSlugs[other]}`)}</loc>`);
    });
  });
}

test("an unknown article is kept out of search engines", async ({ page }) => {
  await page.goto("/en/articles/no-such-article");
  await expect(meta(page, "robots")).toHaveAttribute("content", /noindex/);
});

test("a partly translated article lists only the languages it is published in", async ({ page }) => {
  await page.goto("/en/articles/partial-probe");
  expect(await hreflangs(page)).toEqual({
    en: abs("/en/articles/partial-probe"),
    "pt-BR": abs("/pt-br/articles/sonda-parcial"),
    "x-default": abs("/en/articles/partial-probe"),
  });
});

test("robots.txt allows crawling and lists one sitemap per language", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toContain("Allow: /");
  for (const locale of locales) {
    expect(text).toContain(`Sitemap: ${abs(`/sitemap/${locale}.xml`)}`);
  }
});

test("pages carry no robots header in production mode", async ({ request }) => {
  const response = await request.get("/en");
  expect(response.headers()["x-robots-tag"]).toBeUndefined();
});

for (const [crawler, userAgent] of [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
  ["a link preview", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
]) {
  test(`${crawler} gets the metadata in <head>, before the page body`, async ({ request }) => {
    for (const path of ["/pt-br", `/pt-br/articles/${articleSlugs["pt-br"]}`]) {
      const html = await (await request.get(path, { headers: { "User-Agent": userAgent } })).text();
      const head = html.slice(0, html.indexOf("</head>"));
      expect(head, path).toContain(`<link rel="canonical" href="${abs(path)}"/>`);
      expect(head, path).toContain('hrefLang="x-default"');
      expect(head, path).toContain('<meta name="robots" content="index, follow"/>');
      expect(head, path).toContain('<meta property="og:image"');
    }
  });
}
