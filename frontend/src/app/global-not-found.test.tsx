import axe from "axe-core";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { htmlLang, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import GlobalNotFound from "./global-not-found";

describe("GlobalNotFound", () => {
  beforeAll(() => {
    // Render the full HTML document the way the server sends it.
    document.open();
    document.write(`<!DOCTYPE html>${renderToStaticMarkup(<GlobalNotFound />)}`);
    document.close();
    document.title = "404 · Underplot Society";
  });

  it("declares a document language", () => {
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it.each(locales)("shows the %s message marked with its own language", (locale) => {
    const messages = getMessages(locale).notFound;
    const section = document.querySelector(`section[lang="${htmlLang[locale]}"]`);

    expect(section?.querySelector("h2")?.textContent).toBe(messages.title);
    expect(section?.textContent).toContain(messages.body);

    const link = section?.querySelector("a");
    expect(link?.textContent).toBe(messages.home);
    expect(link?.getAttribute("href")).toBe(`/${locale}`);
  });

  it("has a single top-level heading", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("has no accessibility violations", async () => {
    const results = await axe.run(document, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
