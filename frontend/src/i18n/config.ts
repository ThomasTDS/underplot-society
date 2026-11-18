/** Locales as they appear in the URL: /en, /pt-br, /es. */
export const locales = ["en", "pt-br", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that stores the reader's manual language choice. */
export const LOCALE_COOKIE = "locale";

/** BCP 47 tag for the `lang` attribute of each locale. */
export const htmlLang: Record<Locale, string> = {
  en: "en",
  "pt-br": "pt-BR",
  es: "es",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Each language's name in that language, as shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-br": "Português",
  es: "Español",
};
