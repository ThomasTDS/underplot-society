import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Item 8.4: what the panel does reaches the site without a deploy. The changes go
 * through the same models the panel uses (in tinker, in the backend container),
 * which tell the site which cached pages to drop.
 *
 * Needs the local Docker stack (skipped with E2E_SEED=0, like the seeding).
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function tinker(code: string): string {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "backend", "php", "artisan", "tinker", `--execute=${code}`],
    { cwd: REPO_ROOT, encoding: "utf8" },
  ).trim();
}

/** Status and body of a page, as a visitor gets it. */
async function visit(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  return { status: response.status(), body: await response.text() };
}

test.describe("publishing reaches the site without a deploy", () => {
  test.skip(process.env.E2E_SEED === "0", "needs the local Docker stack");
  test.describe.configure({ mode: "serial" });

  const slug = `live-check-${Date.now()}`;
  const title = `Live check ${slug}`;
  let articleId = "";

  test.beforeAll(() => {
    articleId = tinker(
      [
        "$a = App\\Models\\Article::create(['area_id' => App\\Models\\Area::orderBy('position')->value('id')]);",
        `foreach (['en','pt-br','es'] as $l) { $a->translations()->create(['locale' => $l, 'slug' => '${slug}', 'title' => '${title}', 'summary' => 'Draft.', 'body' => 'Draft.']); }`,
        "echo $a->id;",
      ].join(" "),
    ).split("\n").at(-1)!;
  });

  test.afterAll(() => {
    if (articleId) tinker(`App\\Models\\Article::find(${articleId})?->delete();`);
  });

  test("a draft is a real 404, and stays out of the list", async ({ request }) => {
    expect((await visit(request, `/en/articles/${slug}`)).status).toBe(404);
    expect((await visit(request, "/en/articles")).body).not.toContain(title);
  });

  test("publishing shows it at once, in the list and on its page", async ({ request }) => {
    tinker(`App\\Models\\Article::find(${articleId})->publish();`);

    const page = await visit(request, `/pt-br/articles/${slug}`);
    expect(page.status).toBe(200);
    expect(page.body).toContain(title);
    expect((await visit(request, "/en/articles")).body).toContain(title);
    expect((await visit(request, "/es")).body).toContain(title);
  });

  test("an edit shows at once", async ({ request }) => {
    tinker(
      `App\\Models\\ArticleTranslation::where('slug', '${slug}')->where('locale', 'en')->first()->update(['title' => 'Edited ${slug}']);`,
    );

    const page = await visit(request, `/en/articles/${slug}`);
    expect(page.body).toContain(`Edited ${slug}`);
    expect((await visit(request, "/en/articles")).body).toContain(`Edited ${slug}`);
  });

  test("unpublishing takes it off at once", async ({ request }) => {
    tinker(`App\\Models\\Article::find(${articleId})->unpublish();`);

    expect((await visit(request, `/en/articles/${slug}`)).status).toBe(404);
    expect((await visit(request, "/en/articles")).body).not.toContain(`Edited ${slug}`);
  });
});

test("an unknown article answers with a real 404 status", async ({ request }) => {
  const response = await request.get("/en/articles/no-such-article-at-all");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("noindex");
});
