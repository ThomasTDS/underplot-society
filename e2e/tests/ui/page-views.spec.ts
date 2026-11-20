import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Item 10.4: audience metrics without cookies. A person opening a page adds one to
 * that page's total for the day, in the API's database; bots, prefetches and missing
 * articles add nothing, and the browser gets no cookie and loads nothing else.
 *
 * Needs the local Docker stack (skipped with E2E_SEED=0, like the seeding).
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Today's total for a page, read straight from the database. */
function views(path: string): number {
  const out = execFileSync(
    "docker",
    [
      "compose", "exec", "-T", "backend", "php", "artisan", "tinker",
      `--execute=echo (int) App\\Models\\PageView::where('path', '${path}')->where('day', now('America/Sao_Paulo')->toDateString())->value('views');`,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  return Number(out.trim().split("\n").at(-1));
}

/** Counting happens after the response: wait until the total moves (or not). */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

test.describe("page views", () => {
  test.skip(process.env.E2E_SEED === "0", "needs the local Docker stack");
  test.describe.configure({ mode: "serial" });

  test.describe("a person", () => {
    test.use({ userAgent: CHROME });

    test("opening a page adds one view, with no cookie and nothing from other hosts", async ({ page, context, baseURL }) => {
      const before = views("/pt-br/about");
      const origin = new URL(baseURL!).origin;
      const foreign: string[] = [];
      page.on("request", (r) => {
        if (new URL(r.url()).origin !== origin) foreign.push(r.url());
      });

      await page.goto("/pt-br/about");
      await settle(page);

      expect(views("/pt-br/about")).toBe(before + 1);
      expect(await context.cookies()).toEqual([]);
      expect(foreign).toEqual([]);
    });

    test("a click inside the site counts the page it leads to", async ({ page }) => {
      await page.goto("/es");
      await settle(page);
      const before = views("/es/articles");

      await page.getByRole("navigation").first().getByRole("link", { name: "Artículos" }).click();
      await expect(page).toHaveURL(/\/es\/articles$/);
      await settle(page);

      expect(views("/es/articles")).toBe(before + 1);
    });

    test("pages the site prefetches are not counted until opened", async ({ page }) => {
      const linked = "/es/articles/ejemplo-leyendo-la-letra-pequena";
      const before = views(linked);
      const prefetched: string[] = [];
      page.on("request", (r) => {
        if (new URL(r.url()).pathname === linked) prefetched.push(r.url());
      });

      await page.goto("/es");
      await settle(page);

      expect(prefetched.length, "the home page prefetched the article").toBeGreaterThan(0);
      expect(views(linked)).toBe(before);
    });

    test("a missing article is not counted", async ({ page }) => {
      await page.goto("/en/articles/no-such-article");
      await settle(page);
      expect(views("/en/articles/no-such-article")).toBe(0);
    });
  });

  test("a bot is not counted", async ({ request }) => {
    const before = views("/en/privacy");
    await request.get("/en/privacy", { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)", Accept: "text/html" } });
    await new Promise((r) => setTimeout(r, 500));
    expect(views("/en/privacy")).toBe(before);
  });
});
