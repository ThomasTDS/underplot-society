import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { institutionalPageKeys, institutionalPages } from "@/content/pages";
import { locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { InstitutionalPage } from "./InstitutionalPage";

// The request-time marker never resolves here; it renders nothing anyway.
vi.mock("next/server", () => ({ connection: () => new Promise(() => {}) }));

afterEach(cleanup);

describe.each(institutionalPageKeys)("InstitutionalPage (%s)", (key) => {
  it.each(locales)("shows the %s text with one h1 and a h2 per section", (locale) => {
    const page = institutionalPages[locale][key];
    const { container } = render(<InstitutionalPage lang={locale} page={key} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(page.title);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      page.sections.map((s) => s.heading),
    );
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it.each(locales)("in %s says when it is a draft", (locale) => {
    render(<InstitutionalPage lang={locale} page={key} />);
    const note = screen.queryByRole("note");
    if (institutionalPages[locale][key].draft) {
      expect(note?.textContent).toBe(getMessages(locale).pages.draft);
    } else {
      expect(note).toBeNull();
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<InstitutionalPage lang="pt-br" page={key} />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("InstitutionalPage text", () => {
  it("renders links as links", () => {
    render(<InstitutionalPage lang="pt-br" page="privacy" />);
    const substack = screen.getByRole("link", { name: "política de privacidade do Substack" });
    expect(substack.getAttribute("href")).toBe("https://substack.com/privacy");
  });

  it("marks English passages on a Spanish page", () => {
    const { container } = render(<InstitutionalPage lang="es" page="about" />);
    const english = [...container.querySelectorAll('[lang="en"]')].map((el) => el.textContent);
    expect(english).toEqual(["Underplot Society", "Underplot", "Beneath the Surface"]);
  });

  it("shows the date of the last change in the reader's language", () => {
    const { container } = render(<InstitutionalPage lang="pt-br" page="about" />);
    const time = container.querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe("2026-11-20");
    expect(time?.parentElement?.textContent).toBe("Atualizado em 20 de novembro de 2026");
  });
});
