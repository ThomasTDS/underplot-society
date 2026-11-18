import { describe, expect, it, vi } from "vitest";
import { getArticle, listAreas, listArticles } from "./content-api";

const baseUrl = "http://api.test";

function respond(status: number, body: unknown) {
  return vi.fn(async (url: URL) => {
    void url;
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  });
}

const summary = {
  slug: "hello",
  locale: "en",
  title: "Hello",
  summary: "Short",
  published_at: "2026-11-18T12:00:00+00:00",
  area: { slug: "tech", name: "Tech" },
  cover: { url: "https://site.test/storage/media/a.webp", alt: "Alt", width: 800, height: 600 },
};

const article = {
  ...summary,
  body: "# Hello",
  body_html: "<h1>Hello</h1>",
  seo: { title: "Hello", description: "Short" },
  updated_at: "2026-11-18T12:00:00+00:00",
  translations: { en: "hello", "pt-br": "ola", es: "hola" },
};

const page = { data: [summary], meta: { current_page: 1, last_page: 2, per_page: 12, total: 13 } };

describe("listArticles", () => {
  it("asks for the language, area and page, and returns the parsed page", async () => {
    const fetchFn = respond(200, page);
    const result = await listArticles("pt-br", { area: "tech", page: 2 }, { baseUrl, fetchFn });

    expect(fetchFn.mock.calls[0][0].toString()).toBe("http://api.test/api/v1/pt-br/articles?area=tech&page=2");
    expect(result).toEqual({
      kind: "ok",
      data: {
        items: [
          {
            slug: "hello",
            title: "Hello",
            summary: "Short",
            publishedAt: "2026-11-18T12:00:00+00:00",
            area: { slug: "tech", name: "Tech" },
            cover: { url: "https://site.test/storage/media/a.webp", alt: "Alt", width: 800, height: 600 },
          },
        ],
        page: 1,
        lastPage: 2,
        total: 13,
      },
    });
  });

  it("accepts articles without area or cover", async () => {
    const result = await listArticles("en", {}, { baseUrl, fetchFn: respond(200, { ...page, data: [{ ...summary, area: null, cover: null }] }) });
    expect(result.kind === "ok" && result.data.items[0]).toMatchObject({ area: null, cover: null });
  });

  it.each([404, 422])("treats a %s (unknown area or page) as not found", async (status) => {
    expect(await listArticles("en", {}, { baseUrl, fetchFn: respond(status, {}) })).toEqual({ kind: "not-found" });
  });

  it.each([
    ["a server error", respond(500, page)],
    ["a body that is not JSON", respond(200, "<html>")],
    ["a missing field", respond(200, { ...page, data: [{ ...summary, title: undefined }] })],
    ["a wrong type", respond(200, { ...page, meta: { ...page.meta, total: "13" } })],
    ["a cover with a script URL", respond(200, { ...page, data: [{ ...summary, cover: { ...summary.cover, url: "javascript:alert(1)" } }] })],
    ["a network failure", vi.fn(async () => Promise.reject(new Error("down")))],
  ])("reports %s as an error", async (_, fetchFn) => {
    expect(await listArticles("en", {}, { baseUrl, fetchFn })).toEqual({ kind: "error" });
  });

  it.each([undefined, "", "ftp://api.test", "not a url"])("reports a bad API address (%s) as an error without calling it", async (bad) => {
    const fetchFn = respond(200, page);
    expect(await listArticles("en", {}, { baseUrl: bad, fetchFn })).toEqual({ kind: "error" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("getArticle", () => {
  it("returns the body HTML and the slug in each language", async () => {
    const result = await getArticle("en", "hello", { baseUrl, fetchFn: respond(200, { data: article }) });
    expect(result.kind === "ok" && result.data).toMatchObject({
      bodyHtml: "<h1>Hello</h1>",
      translations: { en: "hello", "pt-br": "ola", es: "hola" },
    });
  });

  it("ignores unknown languages in translations", async () => {
    const result = await getArticle("en", "hello", {
      baseUrl,
      fetchFn: respond(200, { data: { ...article, translations: { en: "hello", fr: "bonjour" } } }),
    });
    expect(result.kind === "ok" && result.data.translations).toEqual({ en: "hello" });
  });

  it.each(["../health", "UPPER", "a/b", "a--b", "x".repeat(201)])("does not call the API for a malformed slug (%s)", async (slug) => {
    const fetchFn = respond(200, { data: article });
    expect(await getArticle("en", slug, { baseUrl, fetchFn })).toEqual({ kind: "not-found" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("treats a 404 as not found and a body without HTML as an error", async () => {
    expect(await getArticle("en", "x", { baseUrl, fetchFn: respond(404, {}) })).toEqual({ kind: "not-found" });
    expect(await getArticle("en", "x", { baseUrl, fetchFn: respond(200, { data: { ...article, body_html: null } }) })).toEqual({
      kind: "error",
    });
  });
});

describe("listAreas", () => {
  it("returns the areas", async () => {
    const result = await listAreas("es", { baseUrl, fetchFn: respond(200, { data: [{ slug: "tech", name: "Tecnología" }] }) });
    expect(result).toEqual({ kind: "ok", data: [{ slug: "tech", name: "Tecnología" }] });
  });

  it("reports a malformed list as an error", async () => {
    expect(await listAreas("es", { baseUrl, fetchFn: respond(200, { data: [{ slug: "tech" }] }) })).toEqual({ kind: "error" });
  });
});
