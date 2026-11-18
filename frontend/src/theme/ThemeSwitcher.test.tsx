import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { THEME_STORAGE_KEY, setThemeChoice } from "./theme";
import { ThemeSwitcher } from "./ThemeSwitcher";

const html = document.documentElement;
const labels = getMessages("en").theme;

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete html.dataset.theme;
});

function radio(name: string) {
  return screen.getByRole<HTMLInputElement>("radio", { name });
}

describe("ThemeSwitcher", () => {
  it.each(locales)("offers the three modes as a named group in %s", (locale) => {
    const localized = getMessages(locale).theme;
    render(<ThemeSwitcher labels={localized} />);

    expect(screen.getByRole("group", { name: localized.legend })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual(["system", "light", "dark"]);
    for (const key of ["system", "light", "dark"] as const) {
      expect(radio(localized[key])).toBeTruthy();
    }
  });

  it("starts on automatic when nothing is saved", () => {
    render(<ThemeSwitcher labels={labels} />);
    expect(radio(labels.system).checked).toBe(true);
  });

  it("shows the saved choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeSwitcher labels={labels} />);
    expect(radio(labels.dark).checked).toBe(true);
  });

  it("applies and saves the chosen theme, and automatic clears it", () => {
    render(<ThemeSwitcher labels={labels} />);

    fireEvent.click(radio(labels.light));
    expect(radio(labels.light).checked).toBe(true);
    expect(html.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    fireEvent.click(radio(labels.system));
    expect(radio(labels.system).checked).toBe(true);
    expect(html.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("updates when the choice changes elsewhere", () => {
    render(<ThemeSwitcher labels={labels} />);
    act(() => setThemeChoice("dark"));
    expect(radio(labels.dark).checked).toBe(true);
  });

  it("has no detectable accessibility problems", async () => {
    const { container } = render(<ThemeSwitcher labels={labels} />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
