"use client";

import { htmlLang, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { fontVariables } from "@/styles/fonts";
import { ThemeScript } from "@/theme/ThemeScript";
import "./globals.css";
import styles from "./standalone-page.module.css";

/**
 * The 500 page for an error the site layout itself could not survive. It replaces
 * the whole document, so the language is not known: the message is shown in every
 * language, each marked with its own `lang`, like the 404 page. Nothing about the
 * error is shown to the reader.
 */
export default function GlobalError() {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <title>500 · Underplot Society</title>
        <meta name="robots" content="noindex" />
      </head>
      <body>
        <main className={styles.main}>
          <p className={styles.brand}>Underplot Society</p>
          <h1 className={styles.code}>500</h1>
          {locales.map((locale) => {
            const messages = getMessages(locale).error;
            return (
              <section key={locale} lang={htmlLang[locale]} className={styles.section}>
                <h2 className={styles.title}>{messages.title}</h2>
                <p className={styles.body}>{messages.body}</p>
                {/* A full page load, not a client navigation: the app just failed. */}
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
