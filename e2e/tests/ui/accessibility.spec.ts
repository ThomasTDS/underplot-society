import { expect, test, type Page } from "@playwright/test";
import { locales } from "../../support/locales";

/**
 * Item 9.1: WCAG 2.2 AA checks that need a real browser and real layout, on every
 * main page in every language. (Automated rules with axe come in 9.2; a screen
 * reader pass is manual, in 9.3.)
 */

const articleSlug = { en: "sample-reading-the-fine-print", "pt-br": "exemplo-lendo-as-letras-miudas", es: "ejemplo-leyendo-la-letra-pequena" } as const;

const pages = locales.flatMap((locale) => [
  { name: `home (${locale})`, path: `/${locale}` },
  { name: `article list (${locale})`, path: `/${locale}/articles` },
  { name: `filtered list (${locale})`, path: `/${locale}/articles?area=${locale === "en" ? "culture" : "cultura"}` },
  { name: `article (${locale})`, path: `/${locale}/articles/${articleSlug[locale]}` },
  { name: `not found (${locale})`, path: `/${locale}/articles/no-such-article` },
]).concat([
  // Its body starts at "# ...": still one h1 on the page.
  { name: "article whose text starts at h1", path: "/en/articles/partial-probe" },
]);

/** Waits for the streamed parts (articles, status) to arrive. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

for (const { name, path } of pages) {
  test.describe(name, () => {
    test("has one h1 and never skips a heading level (1.3.1)", async ({ page }) => {
      await open(page, path);
      const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) =>
        els.filter((el) => (el as HTMLElement).offsetParent !== null || el.getClientRects().length > 0).map((el) => Number(el.tagName[1])),
      );

      expect(levels.filter((level) => level === 1), `headings: ${levels.join(" ")}`).toHaveLength(1);
      expect(levels[0], "the first heading is the h1").toBe(1);
      levels.forEach((level, i) => {
        if (i > 0) expect(level - levels[i - 1], `jump to h${level} after h${levels[i - 1]}`).toBeLessThanOrEqual(1);
      });
    });

    test("reflows at 320 px wide, like 400% zoom, without sideways scrolling (1.4.10)", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("survives the WCAG text spacing overrides without clipping (1.4.12)", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await open(page, path);
      await page.addStyleTag({
        content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
                  p { margin-bottom: 2em !important; }`,
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      // Nothing that holds text cuts it off.
      const clipped = await page.locator("body *").evaluateAll((els) =>
        els
          .filter((el) => {
            const style = getComputedStyle(el);
            const hides = style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden";
            return hides && !el.classList.contains("visually-hidden") && el.scrollHeight > el.clientHeight + 1 && el.textContent?.trim();
          })
          .map((el) => el.outerHTML.slice(0, 80)),
      );
      expect(clipped).toEqual([]);
    });

    test("gives every control a target of at least 24 by 24 px (2.5.8)", async ({ page }) => {
      await open(page, path);
      // Links inside running text are exempt; everything else is checked.
      const small = await page
        .locator("a, button, input, select, textarea, label:has(input)")
        .evaluateAll((els) =>
          els
            .filter((el) => !el.closest("p, li > p, [class*='prose']") || el.closest("nav, fieldset"))
            .filter((el) => !el.matches("input[type=radio]")) // the label is the target
            .map((el) => ({ el, box: el.getBoundingClientRect() }))
            .filter(({ box }) => box.width > 0 && (box.width < 24 || box.height < 24))
            .map(({ el, box }) => `${el.outerHTML.slice(0, 70)} → ${Math.round(box.width)}×${Math.round(box.height)}`),
        );
      expect(small).toEqual([]);
    });

    test("marks text in another language with its own lang (3.1.2)", async ({ page }) => {
      await open(page, path);
      const pageLang = await page.locator("html").getAttribute("lang");
      // The motto is English everywhere; on other pages it must say so.
      for (const motto of await page.getByText("Beneath the Surface.", { exact: true }).all()) {
        const lang = await motto.evaluate((el) => el.closest("[lang]")?.getAttribute("lang"));
        expect(lang, `page lang ${pageLang}`).toBe("en");
      }
    });
  });
}

test("the focus indicator is visible on every control of the home page (2.4.7)", async ({ page }) => {
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const target = el.matches("input[type=radio]") ? el.closest("label")! : el;
      const style = getComputedStyle(target);
      return { html: el.outerHTML.slice(0, 60), outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2 };
    });
    if (!focused) break;
    expect(focused.outline, focused.html).toBe(true);
    if (focused.html.startsWith("<input")) break; // the theme switcher is the last stop
  }
});

test("respects reduced motion: no animation or transition runs (2.3.3)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/articles");
  const moving = await page.locator("body *").evaluateAll((els) =>
    els
      .map((el) => getComputedStyle(el))
      .filter((s) => parseFloat(s.animationDuration) > 0.01 || parseFloat(s.transitionDuration) > 0.01).length,
  );
  expect(moving).toBe(0);
});
