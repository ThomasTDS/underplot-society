import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  readThemeChoice,
  setThemeChoice,
  subscribeThemeChoice,
  themeInitScript,
} from "./theme";

const html = document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete html.dataset.theme;
});

function runInitScript() {
  new Function(themeInitScript)();
}

describe("init script", () => {
  it.each(["light", "dark"])("applies a saved %s theme", (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    runInitScript();
    expect(html.dataset.theme).toBe(theme);
  });

  it.each([null, "system", "purple", '"><script>'])("leaves the theme to the system for %s", (saved) => {
    if (saved !== null) localStorage.setItem(THEME_STORAGE_KEY, saved);
    runInitScript();
    expect(html.hasAttribute("data-theme")).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(runInitScript).not.toThrow();
    expect(html.hasAttribute("data-theme")).toBe(false);
  });
});

describe("theme choice", () => {
  it("is automatic when nothing is saved", () => {
    expect(readThemeChoice()).toBe("system");
  });

  it.each(["light", "dark"] as const)("saves and applies %s", (theme) => {
    setThemeChoice(theme);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme);
    expect(html.dataset.theme).toBe(theme);
    expect(readThemeChoice()).toBe(theme);
  });

  it("automatic clears the saved theme", () => {
    setThemeChoice("dark");
    setThemeChoice("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(html.hasAttribute("data-theme")).toBe(false);
    expect(readThemeChoice()).toBe("system");
  });

  it("still applies the choice when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => setThemeChoice("light")).not.toThrow();
    expect(html.dataset.theme).toBe("light");
  });

  it("notifies subscribers, and follows a change made in another tab", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThemeChoice(listener);

    setThemeChoice("light");
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }));
    expect(html.dataset.theme).toBe("dark");
    expect(listener).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: null }));
    expect(html.hasAttribute("data-theme")).toBe(false);

    window.dispatchEvent(new StorageEvent("storage", { key: "locale", newValue: "en" }));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    setThemeChoice("dark");
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
