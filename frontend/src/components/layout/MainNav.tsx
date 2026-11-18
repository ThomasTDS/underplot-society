"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import styles from "./SiteHeader.module.css";

/** Only pages that exist are listed; each new section adds its link here. */
type Props = { lang: Locale; labels: Messages["nav"] };

export function MainNav(props: Props) {
  return <MainNavLinks {...props} pathname={usePathname()} />;
}

/** Without a pathname (while a request-time page streams in), nothing is marked current. */
export function MainNavLinks({ lang, labels, pathname: rawPathname }: Props & { pathname: string | null }) {
  const pathname = rawPathname?.replace(/\/$/, "") ?? null;
  const links = [
    { href: `/${lang}`, label: labels.home },
    { href: `/${lang}/articles`, label: labels.articles },
  ];

  // "page" on the page itself; "true" inside its section (an article under Articles).
  const current = (href: string) =>
    pathname === href ? "page" : href !== `/${lang}` && pathname?.startsWith(`${href}/`) ? "true" : undefined;

  return (
    <nav aria-label={labels.label}>
      <ul className={styles.list}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} aria-current={current(href)} className={styles.navLink}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
