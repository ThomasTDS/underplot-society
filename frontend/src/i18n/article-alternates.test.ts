import { describe, expect, it } from "vitest";
import { articleAlternates } from "./article-alternates";

describe("articleAlternates", () => {
  it("links each language to the article's own slug", () => {
    expect(articleAlternates({ en: "hello", "pt-br": "ola", es: "hola" })).toEqual({
      en: "/en/articles/hello",
      "pt-br": "/pt-br/articles/ola",
      es: "/es/articles/hola",
    });
  });

  it("sends a missing language to its article list with the fallback notice", () => {
    expect(articleAlternates({ en: "hello" })).toEqual({
      en: "/en/articles/hello",
      "pt-br": "/pt-br/articles?unavailable=article",
      es: "/es/articles?unavailable=article",
    });
  });
});
