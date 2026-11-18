"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "./NotFoundMessage.module.css";

// not-found files get no params, so the language comes from the URL on the client.
export function NotFoundMessage() {
  const { lang } = useParams<{ lang?: string }>();
  const locale = isLocale(lang) ? lang : defaultLocale;
  const text = getMessages(locale).notFound;

  return (
    <div className={styles.notFound} data-page="not-found">
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.body}>{text.body}</p>
      <Link href={`/${locale}`}>{text.home}</Link>
    </div>
  );
}
