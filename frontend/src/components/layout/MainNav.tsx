"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import styles from "./SiteHeader.module.css";

/** Only pages that exist are listed; each new section adds its link here. */
export function MainNav({ lang, labels }: { lang: Locale; labels: Messages["nav"] }) {
  const pathname = usePathname().replace(/\/$/, "");
  const links = [{ href: `/${lang}`, label: labels.home }] as const;

  return (
    <nav aria-label={labels.label}>
      <ul className={styles.list}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} aria-current={pathname === href ? "page" : undefined} className={styles.navLink}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
