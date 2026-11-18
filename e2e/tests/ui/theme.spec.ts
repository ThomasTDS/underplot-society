import { expect, test, type Page } from "@playwright/test";
import { messages } from "../../support/locales";

/** Page backgrounds from frontend/src/styles/tokens.css. */
const BACKGROUND = { dark: "rgb(17, 17, 22)", light: "rgb(245, 243, 247)" } as const;
const labels = messages.en.theme;

function themeRadio(page: Page, name: string) {
  return page.getByRole("group", { name: labels.legend }).getByRole("radio", { name });
}

async function expectBackground(page: Page, theme: keyof typeof BACKGROUND) {
  await expect(page.locator("body")).toHaveCSS("background-color", BACKGROUND[theme]);
}

test.describe("theme", () => {
  for (const system of ["light", "dark"] as const) {
    test(`automatic follows a ${system} system`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await page.goto("/en");

      await expect(themeRadio(page, labels.system)).toBeChecked();
      await expect(page.locator("html")).not.toHaveAttribute("data-theme");
      await expectBackground(page, system);
    });
  }

  for (const [system, chosen] of [
    ["dark", "light"],
    ["light", "dark"],
  ] as const) {
    test(`choosing ${chosen} on a ${system} system wins and is remembered`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await page.goto("/en");

      await themeRadio(page, labels[chosen]).check();
      await expectBackground(page, chosen);

      await page.reload();
      await expect(themeRadio(page, labels[chosen])).toBeChecked();
      await expectBackground(page, chosen);

      // Same choice on another page and language.
      await page.goto("/pt-br");
      await expectBackground(page, chosen);
      await page.goto("/no-such-page");
      await expectBackground(page, chosen);
    });
  }

  test("going back to automatic follows the system again, also after reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en");

    await themeRadio(page, labels.dark).check();
    await expectBackground(page, "dark");
    await themeRadio(page, labels.system).check();
    await expectBackground(page, "light");

    await page.reload();
    await expect(themeRadio(page, labels.system)).toBeChecked();
    await expectBackground(page, "light");
  });

  test("the switcher works with the keyboard alone", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");

    await themeRadio(page, labels.system).focus();
    await page.keyboard.press("ArrowRight");
    await expect(themeRadio(page, labels.light)).toBeChecked();
    await expect(themeRadio(page, labels.light)).toBeFocused();
    await expectBackground(page, "light");
  });

  test("a saved theme is set before the page body exists (no flash)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      // Record the theme at the moment <body> is inserted, before any of it is painted.
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        observer.disconnect();
        (window as unknown as { themeAtBody: string | null }).themeAtBody =
          document.documentElement.getAttribute("data-theme");
      }).observe(document, { childList: true, subtree: true });
    });

    await page.goto("/en");
    expect(await page.evaluate(() => (window as unknown as { themeAtBody: string | null }).themeAtBody)).toBe("dark");
  });

  test("a saved theme applies even if the app's scripts never load", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.route("**/_next/static/**/*.js", (route) => route.abort());

    await page.goto("/en");
    await expectBackground(page, "dark");
  });
});
