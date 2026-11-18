"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getAlternates, subscribeAlternates, type Alternates } from "@/i18n/alternates";
import { htmlLang, LOCALE_COOKIE, localeNames, locales, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/paths";
import styles from "./SiteHeader.module.css";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remembers a manual choice, so `/` and unprefixed links open in this language. */
function rememberLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

/**
 * Plain links to the same page in each language: they work without JavaScript.
 * Each name is in its own language and marked with its own `lang`.
 */
type Props = { current: Locale; label: string };

export function LanguageSwitcher(props: Props) {
  // Pages whose address differs per language (articles) say where each language lives.
  const alternates = useSyncExternalStore(subscribeAlternates, getAlternates, () => null);
  return <LanguageLinks {...props} pathname={usePathname()} alternates={alternates} />;
}

/** Without a pathname (while a request-time page streams in), links go to each home page. */
export function LanguageLinks({
  current,
  label,
  pathname,
  alternates = null,
}: Props & { pathname: string | null; alternates?: Alternates | null }) {

  return (
    <nav aria-label={label}>
      <ul className={styles.list}>
        {locales.map((locale) => (
          <li key={locale}>
            <a
              href={alternates?.[locale] ?? (pathname ? localizedPath(pathname, locale) : `/${locale}`)}
              hrefLang={htmlLang[locale]}
              lang={htmlLang[locale]}
              aria-current={locale === current ? "true" : undefined}
              className={styles.navLink}
              onClick={() => rememberLocale(locale)}
            >
              {localeNames[locale]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
