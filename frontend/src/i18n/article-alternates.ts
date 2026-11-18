import { locales, type Locale } from "./config";

/** Query that tells the article list the reader came from an article missing in its language. */
export const NOT_IN_LANGUAGE = "unavailable=article";

/**
 * Where the language switcher sends the reader from an article: its own page in
 * each language it is published in, otherwise that language's article list, which
 * then says why (a fallback notice instead of a 404).
 */
export function articleAlternates(translations: Partial<Record<Locale, string>>): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => {
      const slug = translations[locale];
      return [locale, slug ? `/${locale}/articles/${slug}` : `/${locale}/articles?${NOT_IN_LANGUAGE}`];
    }),
  ) as Record<Locale, string>;
}
