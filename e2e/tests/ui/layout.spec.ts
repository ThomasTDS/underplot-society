import { expect, test, type Page } from "@playwright/test";
import { messages } from "../../support/locales";

const en = messages.en;

const viewports = {
  phone: { width: 360, height: 740 },
  desktop: { width: 1280, height: 800 },
} as const;

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "the page should not scroll sideways").toBeLessThanOrEqual(0);
}

/** Describes the focused element as "role: name", for comparing Tab order. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "body";
    const kind = el instanceof HTMLInputElement ? `radio:${el.value}` : el.tagName.toLowerCase();
    return `${kind}: ${el.textContent?.trim() ?? ""}`.trim();
  });
}

for (const [device, viewport] of Object.entries(viewports)) {
  test.describe(`base layout on ${device}`, () => {
    test.use({ viewport });

    for (const locale of ["en", "pt-br", "es"] as const) {
      test(`shows header, content and footer in ${locale}, without sideways scroll`, async ({ page }) => {
        const text = messages[locale];
        await page.goto(`/${locale}`);

        const header = page.getByRole("banner");
        await expect(header.getByRole("link", { name: "Underplot Society" })).toBeVisible();
        await expect(header.getByRole("navigation", { name: text.nav.label })).toBeVisible();
        await expect(header.getByRole("navigation", { name: text.language.label })).toBeVisible();
        await expect(page.getByRole("main")).toBeVisible();
        await expect(page.getByRole("contentinfo").getByRole("group", { name: text.theme.legend })).toBeVisible();
        await expectNoHorizontalScroll(page);
      });
    }
  });
}

test.describe("keyboard", () => {
  test("Tab reaches every control in reading order, starting with the skip link", async ({ page }) => {
    await page.goto("/en");

    const order: string[] = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Tab");
      order.push(await focused(page));
    }
    expect(order).toEqual([
      `a: ${en.skipLink}`,
      "a: Underplot Society",
      `a: ${en.nav.home}`,
      "a: English",
      "a: Português",
      "a: Español",
      // The radio group is one Tab stop; arrow keys move inside it (see theme.spec.ts).
      "radio:system:",
    ]);
  });

  test("the skip link appears on focus and moves focus to the content", async ({ page }) => {
    await page.goto("/en");
    const skip = page.getByRole("link", { name: en.skipLink });

    await expect(skip).not.toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("the language switcher works from the keyboard and is remembered", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("navigation", { name: en.language.label }).getByRole("link", { name: "Português" }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/pt-br$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

    // A link without a language now opens in the chosen one.
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt-br$/);
  });
});
