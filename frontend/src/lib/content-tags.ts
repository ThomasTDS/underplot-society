import { locales, type Locale } from "@/i18n/config";

/**
 * Cache tags shared by the site (which assigns them) and the revalidation endpoint
 * (which accepts only these shapes). The backend sends the same strings.
 *
 * - content: everything (areas, images, anything not tied to one article)
 * - articles:{locale}: lists and latest articles in a language
 * - areas:{locale}: the area filter in a language
 * - article:{locale}:{slug}: one article page, found or not
 */
export const CONTENT_TAG = "content";

export const contentTags = {
  list: (locale: Locale) => [CONTENT_TAG, `articles:${locale}`],
  areas: (locale: Locale) => [CONTENT_TAG, `areas:${locale}`],
  article: (locale: Locale, slug: string) => [CONTENT_TAG, `article:${locale}:${slug}`],
};

// Locale codes are letters and hyphens, which need no escaping outside a character class.
const LOCALE = locales.join("|");
const TAG = new RegExp(`^(?:content|(?:articles|areas):(?:${LOCALE})|article:(?:${LOCALE}):[a-z0-9]+(?:-[a-z0-9]+)*)$`);

export function isContentTag(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256 && TAG.test(value);
}
