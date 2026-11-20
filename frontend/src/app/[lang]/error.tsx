"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "@/components/StatusMessage.module.css";

/**
 * The 500 message inside the site layout: header, footer and language stay usable.
 * Nothing about the error is shown (the server logs it); the reader can try again,
 * which fetches the page anew, or go to the home page.
 */
export default function ErrorPage({ retry }: { retry: () => void }) {
  const { lang } = useParams<{ lang?: string }>();
  const locale = isLocale(lang) ? lang : defaultLocale;
  const text = getMessages(locale).error;

  // The content changed under the reader: move focus to the message, so keyboard and
  // screen reader users land on it instead of wherever they were.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className={styles.message} data-page="error">
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        {text.title}
      </h1>
      <p className={styles.body}>{text.body}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => retry()} className={styles.button}>
          {text.retry}
        </button>
        {/* A full page load: after an error, a fresh start is the safer way home. */}
        <a href={`/${locale}`}>{text.home}</a>
      </div>
    </div>
  );
}
