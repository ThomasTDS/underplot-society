import { describe, expect, it } from "vitest";
import { contentTags, isContentTag } from "./content-tags";

describe("content tags", () => {
  it("tags every entry with content and its own tag", () => {
    expect(contentTags.list("pt-br")).toEqual(["content", "articles:pt-br"]);
    expect(contentTags.areas("es")).toEqual(["content", "areas:es"]);
    expect(contentTags.article("en", "my-slug")).toEqual(["content", "article:en:my-slug"]);
  });

  it.each(["content", "articles:en", "areas:pt-br", "article:es:un-articulo", "article:pt-br:a1"])("accepts %s", (tag) => {
    expect(isContentTag(tag)).toBe(true);
  });

  it.each(["", "Content", "articles:fr", "article:en:", "article:en:Bad_Slug", "article:en:a--b", "articles:en;drop", 42, null, `article:en:${"a".repeat(260)}`])(
    "rejects %j",
    (tag) => {
      expect(isContentTag(tag)).toBe(false);
    },
  );
});
