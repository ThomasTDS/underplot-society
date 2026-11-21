import { expect, test, type Page } from "@playwright/test";
import { locales, messages } from "../../support/locales";

/**
 * Needs the sample content (SampleContentSeeder and XssProbeSeeder), which
 * global-setup.ts seeds in the local stack.
 */

const samples = {
  en: { first: "sample-reading-the-fine-print", title: "Sample: reading the fine print of the tools we use", area: "Culture", areaTitle: "Sample: stories beneath the surface" },
  "pt-br": { first: "exemplo-lendo-as-letras-miudas", title: "Exemplo: lendo as letras miúdas das ferramentas que usamos", area: "Cultura", areaTitle: "Exemplo: histórias sob a superfície" },
  es: { first: "ejemplo-leyendo-la-letra-pequena", title: "Ejemplo: leyendo la letra pequeña de las herramientas que usamos", area: "Cultura", areaTitle: "Ejemplo: historias bajo la superficie" },
} as const;

function articleTitles(page: Page) {
  return page.getByRole("main").getByRole("article").getByRole("heading");
}

for (const locale of locales) {
  const text = messages[locale].articles;
  const sample = samples[locale];

  test.describe(`articles (${locale})`, () => {
    test("the list shows published articles and filters by area", async ({ page }) => {
      await page.goto(`/${locale}/articles`);
      await expect(page.getByRole("heading", { level: 1, name: text.heading })).toBeVisible();
      await expect(articleTitles(page).filter({ hasText: sample.title })).toBeVisible();

      const filter = page.getByRole("navigation", { name: text.filterLabel });
      await expect(filter.getByRole("link", { name: text.allAreas })).toHaveAttribute("aria-current", "page");

      await filter.getByRole("link", { name: sample.area }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/articles\\?area=`));
      await expect(filter.getByRole("link", { name: sample.area })).toHaveAttribute("aria-current", "page");
      await expect(articleTitles(page)).toHaveText([sample.areaTitle]);
    });

    test("an article opens with its formatted body, and the switcher follows its translations", async ({ page }) => {
      await page.goto(`/${locale}/articles`);
      await page.getByRole("link", { name: sample.title }).click();

      await expect(page).toHaveURL(`/${locale}/articles/${sample.first}`);
      const article = page.getByRole("main").getByRole("article");
      await expect(article.getByRole("heading", { level: 1, name: sample.title })).toBeVisible();
      await expect(article.getByRole("heading", { level: 2 })).toBeVisible();
      await expect(article.locator("blockquote")).toBeVisible();
      await expect(article.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);

      const other = locales.find((l) => l !== locale)!;
      const switcher = page.getByRole("navigation", { name: messages[locale].language.label });
      await expect(switcher.locator(`a[hreflang]`).nth(locales.indexOf(other))).toHaveAttribute(
        "href",
        `/${other}/articles/${samples[other].first}`,
      );
    });

    test("an unknown article shows the not-found message in the page's language", async ({ page }) => {
      await page.goto(`/${locale}/articles/no-such-article`);
      const notFound = messages[locale].notFound;
      await expect(page.getByRole("heading", { level: 1, name: notFound.title })).toBeVisible();
      await expect(page.getByRole("link", { name: notFound.home })).toHaveAttribute("href", `/${locale}`);
      await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
      await expect(page.getByRole("main").getByRole("article")).toHaveCount(0);
    });
  });
}

test("navigating inside the site to an unknown article shows the message in place, without reloading", async ({ page }) => {
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  const documents: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "document") documents.push(r.url());
  });

  // A client-side navigation, as a link inside the site makes.
  await page.evaluate(() => (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push("/en/articles/no-such-article"));

  await expect(page).toHaveURL(/\/en\/articles\/no-such-article$/);
  await expect(page.getByRole("heading", { level: 1, name: messages.en.notFound.title })).toBeVisible();
  expect(documents, "no full page load").toEqual([]);
});

test("the home page shows the latest articles", async ({ page }) => {
  await page.goto("/en");
  const latest = page.getByRole("region", { name: messages.en.articles.latest });
  await expect(latest.getByRole("article")).toHaveCount(3);
  await expect(latest.getByRole("link", { name: messages.en.articles.all })).toHaveAttribute("href", "/en/articles");
});

test.describe("hostile article content", () => {
  for (const locale of locales) {
    test(`runs no script and shows the attempts as text (${locale})`, async ({ page }) => {
      const dialogs: string[] = [];
      page.on("dialog", (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });

      await page.goto(`/${locale}/articles/xss-probe`);
      const article = page.getByRole("main").getByRole("article");
      await expect(article).toContainText("Text after the attacks.");
      // The title's script tag is shown as text, not run.
      await expect(article.getByRole("heading", { level: 1 })).toContainText("<script>");

      // Give event handlers (onerror, onload, ontoggle) a chance to fire.
      await page.waitForLoadState("load");
      await page.waitForTimeout(500);

      // Click every link in the body: none may run a javascript: URL.
      for (const link of await article.locator("a").all()) {
        await link.click({ modifiers: ["ControlOrMeta"] }).catch(() => {});
      }

      expect(await page.evaluate(() => (window as unknown as { __xss?: unknown }).__xss)).toBeUndefined();
      expect(dialogs).toEqual([]);
      await expect(article.locator("script, iframe, svg, details, [onerror], [onload], [ontoggle]")).toHaveCount(0);
      await expect(article.locator('a[href^="javascript" i], img[src^="javascript" i]')).toHaveCount(0);
    });
  }
});
