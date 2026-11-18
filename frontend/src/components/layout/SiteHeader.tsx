import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MainNav } from "./MainNav";
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
          <MainNav lang={lang} labels={messages.nav} />
          <LanguageSwitcher current={lang} label={messages.language.label} />
        </div>
      </div>
    </header>
  );
}
