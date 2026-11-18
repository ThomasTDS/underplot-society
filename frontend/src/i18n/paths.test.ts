import { describe, expect, it } from "vitest";
import { localizedPath } from "./paths";

describe("localizedPath", () => {
  it.each([
    ["/en", "pt-br", "/pt-br"],
    ["/en/", "es", "/es"],
    ["/pt-br/articles/my-slug", "en", "/en/articles/my-slug"],
    ["/es/a/b", "es", "/es/a/b"],
    ["/", "pt-br", "/pt-br"],
    ["/about", "es", "/es/about"],
  ] as const)("%s in %s is %s", (path, locale, expected) => {
    expect(localizedPath(path, locale)).toBe(expected);
  });
});
