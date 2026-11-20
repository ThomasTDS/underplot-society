import type { Messages } from "@/i18n/dictionaries";
import { Suspense } from "react";
import { NewsletterFooterLink } from "@/components/Newsletter";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ messages }: { messages: Messages }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copyright}>© Underplot Society</p>
        <Suspense fallback={null}>
          <NewsletterFooterLink labels={messages.newsletter} />
        </Suspense>
        <ThemeSwitcher labels={messages.theme} />
      </div>
    </footer>
  );
}
