import { isLocale, type Locale } from "./config";

/** The same page in another language: swaps the locale prefix of a path. */
export function localizedPath(pathname: string, locale: Locale): string {
  const [, first = "", ...rest] = pathname.split("/");
  const tail = isLocale(first) ? rest : [first, ...rest].filter(Boolean);
  return ["", locale, ...tail].join("/").replace(/\/$/, "") || `/${locale}`;
}
