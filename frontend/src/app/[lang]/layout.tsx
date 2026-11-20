import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { htmlLang, isLocale, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { baseMetadata } from "@/seo/metadata";
import { getSiteConfig } from "@/seo/site";
import { fontVariables } from "@/styles/fonts";
import { ThemeScript } from "@/theme/ThemeScript";
import "../globals.css";
import styles from "./layout.module.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }

  return baseMetadata(await getSiteConfig(), lang, getMessages(lang).home.tagline);
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const messages = getMessages(lang);

  // suppressHydrationWarning: the theme script may set data-theme on <html> before React loads.
  return (
    <html lang={htmlLang[lang]} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={styles.body}>
        <a href="#content" className={styles.skipLink}>
          {messages.skipLink}
        </a>
        <SiteHeader lang={lang} messages={messages} />
        {/* tabIndex lets the skip link move keyboard focus here, not only the scroll position. */}
        <main id="content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
        <SiteFooter lang={lang} messages={messages} />
      </body>
    </html>
  );
}
