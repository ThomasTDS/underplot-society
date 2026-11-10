import type { Metadata } from "next";
import { htmlLang, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import "./globals.css";
import styles from "./global-not-found.module.css";

export const metadata: Metadata = {
  title: "404 · Underplot Society",
  robots: { index: false },
};

/**
 * 404 for any URL that matches no page. The locale is not known here, so the
 * message is shown in every language, each marked with its own `lang`.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className={styles.main}>
          <h1 className={styles.code}>404</h1>
          {locales.map((locale) => {
            const messages = getMessages(locale).notFound;
            return (
              <section key={locale} lang={htmlLang[locale]} className={styles.section}>
                <h2 className={styles.title}>{messages.title}</h2>
                <p className={styles.body}>{messages.body}</p>
                <a href={`/${locale}`} className={styles.link}>
                  {messages.home}
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
