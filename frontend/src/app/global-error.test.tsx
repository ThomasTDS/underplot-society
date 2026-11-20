import axe from "axe-core";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { htmlLang, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import GlobalError from "./global-error";

describe("GlobalError", () => {
  let markup = "";

  beforeAll(() => {
    // Render the full HTML document the way the server sends it.
    markup = renderToStaticMarkup(<GlobalError />);
    document.open();
    document.write(`<!DOCTYPE html>${markup}`);
    document.close();
  });

  it("declares a document language, a title and noindex", () => {
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(markup).toContain("<title>500 · Underplot Society</title>");
    expect(markup).toContain('<meta name="robots" content="noindex"/>');
  });

  it.each(locales)("shows the %s message marked with its own language", (locale) => {
    const messages = getMessages(locale).error;
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
    const results = await axe.run(document, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
