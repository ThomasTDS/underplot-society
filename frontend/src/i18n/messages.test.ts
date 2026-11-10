// @vitest-environment node
import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { dictionaries } from "./dictionaries";

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return { [prefix]: value };
  }
  return Object.entries(value).reduce<Record<string, unknown>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

const english = flatten(dictionaries.en);

describe("message files", () => {
  it.each(locales)("%s has exactly the same keys as English", (locale) => {
    expect(Object.keys(flatten(dictionaries[locale])).sort()).toEqual(Object.keys(english).sort());
  });

  it.each(locales)("%s has a non-empty text for every key", (locale) => {
    for (const [key, text] of Object.entries(flatten(dictionaries[locale]))) {
      expect(typeof text, key).toBe("string");
      expect((text as string).trim(), key).not.toBe("");
    }
  });
});
