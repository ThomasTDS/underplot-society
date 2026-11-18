import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import { Suspense } from "react";
import { LanguageLinks, LanguageSwitcher } from "./LanguageSwitcher";
import { MainNav, MainNavLinks } from "./MainNav";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ lang, messages }: { lang: Locale; messages: Messages }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Provisional logo: the wordmark in the display font. */}
        <Link href={`/${lang}`} className={styles.wordmark}>
          Underplot Society
        </Link>
        <div className={styles.navs}>
          {/* Pages rendered at request time know their address only then; until it streams
              in, the same links show without the current-page marks. */}
          <Suspense fallback={<MainNavLinks lang={lang} labels={messages.nav} pathname={null} />}>
            <MainNav lang={lang} labels={messages.nav} />
          </Suspense>
          <Suspense fallback={<LanguageLinks current={lang} label={messages.language.label} pathname={null} />}>
            <LanguageSwitcher current={lang} label={messages.language.label} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
