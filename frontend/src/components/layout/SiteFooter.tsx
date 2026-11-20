import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import { Suspense } from "react";
import { NewsletterFooterLink } from "@/components/Newsletter";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ lang, messages }: { lang: Locale; messages: Messages }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copyright}>© Underplot Society</p>
        <nav aria-label={messages.footerNav.label}>
          <ul className={styles.links}>
            <li>
              <Link href={`/${lang}/privacy`}>{messages.footerNav.privacy}</Link>
            </li>
            <li>
              <Link href={`/${lang}/accessibility`}>{messages.footerNav.accessibility}</Link>
            </li>
            <Suspense fallback={null}>
              <NewsletterFooterLink labels={messages.newsletter} />
            </Suspense>
          </ul>
        </nav>
        <ThemeSwitcher labels={messages.theme} />
      </div>
    </footer>
  );
}
