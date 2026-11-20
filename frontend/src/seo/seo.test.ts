import { describe, expect, it } from "vitest";
import { siteConfigFrom } from "./config";
import { baseMetadata, languageAlternates, pageAlternates, samePathInEveryLanguage } from "./metadata";

const production = siteConfigFrom({ SITE_URL: "https://underplotsociety.com.br", SITE_INDEXING: "on" });
const staging = siteConfigFrom({ SITE_URL: "https://staging.underplotsociety.com.br" });

describe("siteConfigFrom", () => {
  it("is indexable only with a site URL and SITE_INDEXING=on", () => {
    expect(production).toEqual({ url: new URL("https://underplotsociety.com.br"), indexable: true });
    expect(staging.indexable).toBe(false);
    expect(siteConfigFrom({ SITE_INDEXING: "on" })).toEqual({ url: null, indexable: false });
    expect(siteConfigFrom({ SITE_URL: "https://x.test", SITE_INDEXING: "true" }).indexable).toBe(false);
  });

  it.each(["", "  ", "not a url", "ftp://x.test", "javascript:alert(1)"])("rejects the site URL %j", (value) => {
    expect(siteConfigFrom({ SITE_URL: value, SITE_INDEXING: "on" })).toEqual({ url: null, indexable: false });
  });

  it("keeps only the origin", () => {
    expect(siteConfigFrom({ SITE_URL: "https://x.test/some/path?q=1" }).url?.toString()).toBe("https://x.test/");
  });
});

describe("languageAlternates", () => {
  it("keys each path by its hreflang tag and adds x-default", () => {
    expect(languageAlternates(samePathInEveryLanguage("/articles"), "/articles")).toEqual({
      en: "/en/articles",
      "pt-BR": "/pt-br/articles",
      es: "/es/articles",
      "x-default": "/articles",
    });
  });

  it("leaves out languages the page does not exist in", () => {
    expect(languageAlternates({ en: "/en/articles/a", "pt-br": "/pt-br/articles/b" }, undefined)).toEqual({
      en: "/en/articles/a",
      "pt-BR": "/pt-br/articles/b",
    });
  });
});

describe("baseMetadata", () => {
  it("lets production be indexed and shares the default image", () => {
    const meta = baseMetadata(production, "pt-br", "Beneath the Surface.");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.metadataBase?.toString()).toBe("https://underplotsociety.com.br/");
    expect(meta.openGraph).toMatchObject({ locale: "pt_BR", alternateLocale: ["en_US", "es_ES"], siteName: "Underplot Society" });
    expect((meta.openGraph as { images?: unknown[] }).images).toHaveLength(1);
  });

  it("keeps staging and a missing URL out of search engines", () => {
    expect(baseMetadata(staging, "en", "x").robots).toEqual({ index: false, follow: false });
    const noUrl = baseMetadata(siteConfigFrom({}), "en", "x");
    expect(noUrl.robots).toEqual({ index: false, follow: false });
    expect(noUrl.metadataBase).toBeUndefined();
  });
});

describe("pageAlternates", () => {
  it("emits nothing without a site URL, since hreflang must be absolute", () => {
    expect(pageAlternates(siteConfigFrom({}), "/en", samePathInEveryLanguage(""), "/")).toBeUndefined();
  });
});
