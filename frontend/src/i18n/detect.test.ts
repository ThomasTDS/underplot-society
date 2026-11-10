// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectLocale, resolveLocale } from "./detect";

describe("detectLocale", () => {
  // Acceptance criteria.
  it.each([
    ["pt-BR", "pt-br"],
    ["pt-PT", "pt-br"],
    ["pt-AO", "pt-br"],
    ["es-MX", "es"],
    ["es-AR", "es"],
    ["en-US", "en"],
    ["fr-FR", "en"],
  ])("maps %s to %s", (header, expected) => {
    expect(detectLocale(header)).toBe(expected);
  });

  it("falls back to English for an empty header", () => {
    expect(detectLocale("")).toBe("en");
  });

  it.each([
    ["garbage", "!!!"],
    ["separators only", ";;;,,,"],
    ["a number", "123"],
    ["a script tag", "<script>alert(1)</script>"],
    ["a tag with spaces inside", "pt BR"],
    ["an oversized subtag", "pt-abcdefghijk"],
  ])("falls back to English for an invalid header (%s)", (_case, header) => {
    expect(detectLocale(header)).toBe("en");
  });

  // Further edge cases.
  it.each([
    ["missing (undefined)", undefined],
    ["missing (null)", null],
  ])("falls back to English when the header is %s", (_case, header) => {
    expect(detectLocale(header)).toBe("en");
  });

  it.each([
    ["bare language", "pt", "pt-br"],
    ["lower-case region", "es-mx", "es"],
    ["upper-case language", "PT-BR", "pt-br"],
    ["extra subtags", "es-419", "es"],
    ["script subtag", "pt-Latn-BR", "pt-br"],
    ["surrounding spaces", "  es-AR ;q=0.9 ", "es"],
  ])("normalises the tag (%s)", (_case, header, expected) => {
    expect(detectLocale(header)).toBe(expected);
  });

  it.each([
    ["first supported language in order", "fr-FR,pt-BR;q=0.9,en;q=0.8", "pt-br"],
    ["higher quality wins over position", "en;q=0.5,es;q=0.9", "es"],
    ["equal quality keeps the reader's order", "es;q=0.8,pt;q=0.8", "es"],
    ["typical browser header", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7", "pt-br"],
    ["unsupported languages only", "fr-FR,de;q=0.9,ja;q=0.8", "en"],
  ])("respects the order of preference (%s)", (_case, header, expected) => {
    expect(detectLocale(header)).toBe(expected);
  });

  it.each([
    ["q=0 means not acceptable", "pt;q=0,es;q=0.5", "es"],
    ["malformed quality drops the entry", "pt;q=abc,es;q=0.5", "es"],
    ["quality above 1 drops the entry", "pt;q=2,es;q=0.5", "es"],
    ["wildcard alone", "*", "en"],
    ["wildcard before a language", "*,es;q=0.5", "es"],
  ])("handles quality values and wildcards (%s)", (_case, header, expected) => {
    expect(detectLocale(header)).toBe(expected);
  });

  it("ignores languages beyond the parsing limits of an oversized header", () => {
    const filler = Array.from({ length: 200 }, () => "fr").join(",");

    expect(detectLocale(`${filler},es`)).toBe("en");
    expect(detectLocale(`es,${filler}`)).toBe("es");
  });
});

describe("resolveLocale", () => {
  it("prefers a valid cookie over the browser languages", () => {
    expect(resolveLocale("es", "pt-BR")).toBe("es");
  });

  it.each([
    ["missing", undefined],
    ["unsupported", "fr"],
    ["wrong case", "PT-BR"],
    ["empty", ""],
  ])("ignores a %s cookie and uses the browser languages", (_case, cookie) => {
    expect(resolveLocale(cookie, "pt-PT")).toBe("pt-br");
  });
});
