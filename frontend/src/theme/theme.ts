/**
 * The reader's theme choice. "system" (the default) stores nothing and leaves the
 * theme to CSS, which follows prefers-color-scheme. "light" and "dark" are saved in
 * localStorage and set data-theme on <html>, which overrides the system.
 */

export const THEME_STORAGE_KEY = "theme";

export const themeChoices = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof themeChoices)[number];

type SavedTheme = Exclude<ThemeChoice, "system">;

function isSavedTheme(value: unknown): value is SavedTheme {
  return value === "light" || value === "dark";
}

/**
 * Runs in <head> before the body is parsed, so a saved theme never flashes.
 * A fixed string, with nothing interpolated; theme.test.ts checks it reads
 * THEME_STORAGE_KEY.
 */
export const themeInitScript =
  '(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();';

function apply(theme: SavedTheme | null) {
  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isSavedTheme(saved) ? saved : "system";
  } catch {
    // Storage blocked (privacy settings): the theme still follows the system.
    return "system";
  }
}

const listeners = new Set<() => void>();

export function setThemeChoice(choice: ThemeChoice) {
  const theme = isSavedTheme(choice) ? choice : null;
  apply(theme);
  try {
    if (theme) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // Not saved, but still applied to this page.
  }
  listeners.forEach((listener) => listener());
}

/** Also follows changes made in other tabs. */
export function subscribeThemeChoice(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    apply(isSavedTheme(event.newValue) ? event.newValue : null);
    listener();
  }

  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
