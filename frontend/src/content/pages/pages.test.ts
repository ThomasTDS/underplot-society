// @vitest-environment node
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { institutionalPageKeys, institutionalPages } from ".";
import type { Block, Inline, InstitutionalPage } from "./types";

/** Every piece of text on a page, with its link and language, in reading order. */
function pieces(page: InstitutionalPage): Exclude<Inline, string>[] {
  const fromValue = (value: string | Inline[]) =>
    (typeof value === "string" ? [value] : value).map((p) => (typeof p === "string" ? { text: p } : p));
  const fromBlocks = (blocks: Block[]) =>
    blocks.flatMap((b) => (typeof b === "object" && "list" in b ? b.list.flatMap(fromValue) : fromValue(b)));
  return [
    { text: page.title },
    { text: page.description },
    ...fromBlocks(page.intro),
    ...page.sections.flatMap((s) => [{ text: s.heading }, ...fromBlocks(s.blocks)]),
  ];
}

describe.each(institutionalPageKeys)("the %s page", (key) => {
  const english = institutionalPages.en[key];

  it.each(locales)("in %s has no empty text", (locale) => {
    for (const piece of pieces(institutionalPages[locale][key])) {
      expect(piece.text.trim(), JSON.stringify(piece)).not.toBe("");
    }
  });

  it.each(locales)("in %s has the same sections, links, status and date as in English", (locale) => {
    const page = institutionalPages[locale][key];
    expect(page.sections).toHaveLength(english.sections.length);
    const hrefs = (p: InstitutionalPage) => pieces(p).flatMap((x) => (x.href ? [x.href] : []));
    expect(hrefs(page)).toEqual(hrefs(english));
    expect(page.draft).toBe(english.draft);
    expect(page.updated).toBe(english.updated);
  });

  it.each(locales)("in %s links only to https addresses and marks only English passages", (locale) => {
    for (const piece of pieces(institutionalPages[locale][key])) {
      if (piece.href) expect(piece.href).toMatch(/^https:\/\//);
      if (piece.lang) {
        expect(piece.lang).toBe("en");
        expect(locale).not.toBe("en");
      }
    }
  });

  it("has a real date", () => {
    expect(english.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(english.updated))).toBe(false);
  });
});
