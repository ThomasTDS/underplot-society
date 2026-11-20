import { expect, test } from "@playwright/test";
import { BASE_URL } from "../../playwright.config";
import { pages as en } from "../../../frontend/src/content/pages/en";
import { pages as es } from "../../../frontend/src/content/pages/es";
import { pages as ptBr } from "../../../frontend/src/content/pages/pt-br";
import { htmlLang, locales, messages } from "../../support/locales";

/**
 * Item 10.2: About, Privacy and Accessibility in every language, reachable from the
 * header and footer, and the same page in each language.
 */

const content = { en, "pt-br": ptBr, es } as const;
const SITE = new URL(BASE_URL).origin;

for (const locale of locales) {
  const text = messages[locale];

  test(`the header and footer lead to each page (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);

    await page.getByRole("navigation", { name: text.nav.label }).getByRole("link", { name: text.nav.about }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(content[locale].about.title);
    await expect(
      page.getByRole("navigation", { name: text.nav.label }).getByRole("link", { name: text.nav.about }),
    ).toHaveAttribute("aria-current", "page");

    const footer = page.getByRole("contentinfo").getByRole("navigation", { name: text.footerNav.label });
    await footer.getByRole("link", { name: text.footerNav.privacy }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/privacy$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(content[locale].privacy.title);

    await footer.getByRole("link", { name: text.footerNav.accessibility }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/accessibility$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(content[locale].accessibility.title);
  });

  for (const key of ["about", "privacy", "accessibility"] as const) {
    test(`the ${key} page has its title, description, sections and draft notice (${locale})`, async ({ page }) => {
      const data = content[locale][key];
      await page.goto(`/${locale}/${key}`);

      await expect(page).toHaveTitle(`${data.title} · Underplot Society`);
      await expect(page.locator('meta[name="description"]').first()).toHaveAttribute("content", data.description);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang[locale]);
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(data.sections.map((s) => s.heading));
      if (data.draft) await expect(page.getByRole("note")).toHaveText(text.pages.draft);
    });
  }
}

test("the language switcher keeps the reader on the same page", async ({ page }) => {
  await page.goto("/pt-br/privacy");
  await page.getByRole("navigation", { name: messages["pt-br"].language.label }).getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.privacy.title);
});

test("each page is canonical and lists its translations", async ({ page }) => {
  await page.goto("/es/accessibility");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/es/accessibility`);
  for (const locale of locales) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${htmlLang[locale]}"]`)).toHaveAttribute(
      "href",
      `${SITE}/${locale}/accessibility`,
    );
  }
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", `${SITE}/accessibility`);
});

test("the stand-alone 404 page looks like the rest of the site", async ({ page }) => {
  const look = async () => ({
    background: await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
    headingFont: await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
    textFont: await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily),
  });
  await page.goto("/en");
  const site = await look();

  await page.goto("/no-such-page");
  await expect(page.getByText("Underplot Society", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("404");
  expect(await look()).toEqual(site);
});
