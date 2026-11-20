import { connection } from "next/server";
import type { Messages } from "@/i18n/dictionaries";
import { newsletterUrlFrom } from "@/lib/newsletter";
import styles from "./Newsletter.module.css";

type Labels = Messages["newsletter"];

async function newsletterUrl() {
  await connection();
  return newsletterUrlFrom(process.env);
}

/**
 * A plain link, not Substack's embedded form: an embed would load Substack's
 * scripts and cookies on every page. Opens in the same tab, so the reader is never
 * surprised by a new window, and says where it goes.
 */
export async function NewsletterSection({ labels, headingLevel = 2 }: { labels: Labels; headingLevel?: 2 | 3 }) {
  const url = await newsletterUrl();
  if (!url) return null;
  const Heading = `h${headingLevel}` as const;

  return (
    <section aria-labelledby="newsletter" className={styles.section}>
      <Heading id="newsletter" className={styles.heading}>
        {labels.heading}
      </Heading>
      <p className={styles.text}>{labels.text}</p>
      <a href={url} className={styles.cta}>
        {labels.cta}
      </a>
    </section>
  );
}

export async function NewsletterFooterLink({ labels }: { labels: Labels }) {
  const url = await newsletterUrl();
  if (!url) return null;
  return <a href={url}>{labels.footer}</a>;
}
