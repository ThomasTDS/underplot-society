import { expect, test } from "@playwright/test";

/**
 * What the privacy policy promises, checked: visiting the site loads nothing from
 * any other host (no fonts, analytics, embeds or trackers), and sets no cookie until
 * the reader picks a language by hand.
 */

const pages = [
  "/en",
  "/pt-br/articles",
  "/es/articles/ejemplo-leyendo-la-letra-pequena",
  "/en/articles/no-such-article",
  "/pt-br/privacy",
  "/no-such-page",
];

for (const path of pages) {
  test(`${path} loads nothing from other hosts and sets no cookie`, async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin && url.protocol !== "data:" && url.protocol !== "blob:") foreign.push(request.url());
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(foreign).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });
}

test("choosing a language sets only the locale cookie, for a year, readable by this site only", async ({ page, context }) => {
  await page.goto("/en");
  await page.getByRole("navigation", { name: "Language" }).getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/es$/);

  const cookies = await context.cookies();
  expect(cookies.map((c) => c.name)).toEqual(["locale"]);
  expect(cookies[0]).toMatchObject({ value: "es", sameSite: "Lax", path: "/" });
  const days = (cookies[0].expires - Date.now() / 1000) / 86400;
  expect(days).toBeGreaterThan(360);
  expect(days).toBeLessThan(370);
});
