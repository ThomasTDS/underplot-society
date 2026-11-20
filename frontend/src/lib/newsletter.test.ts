import { describe, expect, it } from "vitest";
import { newsletterUrlFrom } from "./newsletter";

describe("newsletterUrlFrom", () => {
  it("accepts an https address", () => {
    expect(newsletterUrlFrom({ NEWSLETTER_URL: " https://underplot.substack.com " })).toBe("https://underplot.substack.com/");
  });

  it.each([undefined, "", "http://underplot.substack.com", "javascript:alert(1)", "not a url"])("shows nothing for %j", (value) => {
    expect(newsletterUrlFrom({ NEWSLETTER_URL: value })).toBeNull();
  });
});
