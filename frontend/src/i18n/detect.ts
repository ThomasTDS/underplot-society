import { defaultLocale, isLocale, type Locale } from "./config";

/** Longer headers are cut before parsing; real browsers send far less. */
const MAX_HEADER_LENGTH = 1024;
const MAX_ENTRIES = 32;

const LANGUAGE_TAG = /^(?:\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)$/;
const QUALITY = /^q=(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

/** Which site locale each language serves. Any other language gets the default. */
const LANGUAGE_TO_LOCALE: Record<string, Locale> = {
  en: "en",
  pt: "pt-br",
  es: "es",
};

interface Preference {
  language: string;
  quality: number;
  position: number;
}

/**
 * Pick the site locale from an `Accept-Language` header.
 *
 * Languages are tried in the reader's order of preference (by `q`, then by
 * position). Any Portuguese variant maps to `pt-br`, any Spanish variant to
 * `es`, English to `en`. Anything else, an empty header or an invalid one
 * falls back to English.
 */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  for (const { language } of parseAcceptLanguage(acceptLanguage)) {
    const locale = LANGUAGE_TO_LOCALE[language];
    if (locale) {
      return locale;
    }
  }
  return defaultLocale;
}

/**
 * The reader's manual choice (cookie) wins over the browser's languages.
 */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  return isLocale(cookieValue) ? cookieValue : detectLocale(acceptLanguage);
}

function parseAcceptLanguage(header: string | null | undefined): Preference[] {
  if (typeof header !== "string") {
    return [];
  }

  const preferences: Preference[] = [];
  const entries = header.slice(0, MAX_HEADER_LENGTH).split(",").slice(0, MAX_ENTRIES);

  entries.forEach((entry, position) => {
    const [rawTag = "", ...params] = entry.split(";").map((part) => part.trim());
    const tag = rawTag.toLowerCase();
    if (!LANGUAGE_TAG.test(tag) || tag === "*") {
      return;
    }

    let quality = 1;
    for (const param of params) {
      if (!param.toLowerCase().startsWith("q=")) {
        continue;
      }
      if (!QUALITY.test(param.toLowerCase())) {
        return; // Malformed quality: ignore the whole entry.
      }
      quality = Number(param.slice(2));
    }

    if (quality > 0) {
      preferences.push({ language: tag.split("-")[0], quality, position });
    }
  });

  return preferences.sort((a, b) => b.quality - a.quality || a.position - b.position);
}
