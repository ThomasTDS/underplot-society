import type { Metadata } from "next";
import { htmlLang, locales, type Locale } from "@/i18n/config";
import type { SiteConfig } from "./config";

export const SITE_NAME = "Underplot Society";
export const DEFAULT_SHARE_IMAGE = { url: "/og-default.png", width: 1200, height: 630 } as const;

const OG_LOCALE: Record<Locale, string> = { en: "en_US", "pt-br": "pt_BR", es: "es_ES" };

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}

/**
 * hreflang links: one per language the page exists in (keyed by BCP 47 tag), plus
 * x-default for readers whose language the site does not have.
 */
export function languageAlternates(
  paths: Partial<Record<Locale, string>>,
  xDefault: string | undefined,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const path = paths[locale];
    if (path) languages[htmlLang[locale]] = path;
  }
  if (xDefault) languages["x-default"] = xDefault;
  return languages;
}

/** The same path in every language: /en/x, /pt-br/x, /es/x. */
export function samePathInEveryLanguage(rest: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, `/${locale}${rest}`])) as Record<Locale, string>;
}

/**
 * Base metadata every localized page gets: absolute URLs, robots, site name and the
 * default share image. Without a site URL, no absolute link is emitted and the page
 * is kept out of search engines.
 */
export function baseMetadata(site: SiteConfig, locale: Locale, description: string): Metadata {
  return {
    metadataBase: site.url ?? undefined,
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description,
    robots: site.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: locales.filter((l) => l !== locale).map(ogLocale),
      type: "website",
      ...(site.url ? { images: [DEFAULT_SHARE_IMAGE] } : {}),
    },
    twitter: { card: "summary_large_image" },
  };
}

/** canonical and hreflang, only when absolute URLs can be built. */
export function pageAlternates(
  site: SiteConfig,
  canonical: string,
  paths: Partial<Record<Locale, string>>,
  xDefault: string | undefined,
): Metadata["alternates"] {
  if (!site.url) return undefined;
  return { canonical, languages: languageAlternates(paths, xDefault) };
}
