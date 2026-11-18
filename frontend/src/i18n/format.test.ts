import { describe, expect, it } from "vitest";
import { fill, formatDate } from "./format";

describe("formatDate", () => {
  it.each([
    ["en", "November 18, 2026"],
    ["pt-br", "18 de novembro de 2026"],
    ["es", "18 de noviembre de 2026"],
  ] as const)("writes the date in %s", (locale, expected) => {
    expect(formatDate("2026-11-18T15:00:00+00:00", locale)).toBe(expected);
  });

  it("uses the Brazilian calendar day", () => {
    expect(formatDate("2026-11-19T01:00:00+00:00", "en")).toBe("November 18, 2026");
  });

  it("returns nothing for an invalid date", () => {
    expect(formatDate("not a date", "en")).toBe("");
  });
});

describe("fill", () => {
  it("replaces known placeholders and keeps unknown ones", () => {
    expect(fill("Page {page} of {total} {x}", { page: 2, total: 5 })).toBe("Page 2 of 5 {x}");
  });
});
