import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { htmlLang, isLocale, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { fontVariables } from "@/styles/fonts";
import { ThemeScript } from "@/theme/ThemeScript";
import { ThemeSwitcher } from "@/theme/ThemeSwitcher";
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

  return {
    title: "Underplot Society",
    description: getMessages(lang).home.tagline,
  };
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
      <body>
        {children}
        {/* Provisional place; the base layout (7.3) moves it into the site footer. */}
        <footer className={styles.footer}>
          <ThemeSwitcher labels={messages.theme} />
        </footer>
      </body>
    </html>
  );
}
