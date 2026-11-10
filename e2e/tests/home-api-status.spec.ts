import { expect, test } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { htmlLang, locales } from "../support/locales";

for (const locale of locales) {
  test.describe(`home page (${locale})`, () => {
    test("reports the API as operational when the whole stack is up", async ({ page }) => {
      const home = new HomePage(page, locale);

      const response = await home.goto();
      expect(response?.status(), `GET /${locale} should succeed`).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang[locale]);
      await expect(home.heading).toBeVisible();

      await expect(
        home.apiStatus,
        [
          "The home page should report the API as operational.",
          "If it reports 'unreachable', the backend is down: check `docker compose ps` and the backend logs.",
          "If it reports 'degraded', the backend is up but its database is not.",
        ].join("\n"),
      ).toHaveAttribute("data-status", "operational");
      await expect(home.apiStatus).toContainText(home.statusLabel("operational"));
    });
  });
}
