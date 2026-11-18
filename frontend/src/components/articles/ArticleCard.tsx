import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import { formatDate } from "@/i18n/format";
import type { ArticleSummary } from "@/lib/content-api";
import styles from "./articles.module.css";

/** An article in a list. Text from the API is rendered as text, never as HTML. */
export function ArticleCard({
  article,
  lang,
  labels,
  headingLevel = 2,
}: {
  article: ArticleSummary;
  lang: Locale;
  labels: Messages["articles"];
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;

  return (
    <article className={styles.card}>
      <Heading className={styles.cardTitle}>
        <Link href={`/${lang}/articles/${article.slug}`}>{article.title}</Link>
      </Heading>
      <ArticleMeta article={article} lang={lang} labels={labels} />
      {article.summary && <p className={styles.cardSummary}>{article.summary}</p>}
    </article>
  );
}

export function ArticleMeta({
  article,
  lang,
  labels,
}: {
  article: ArticleSummary;
  lang: Locale;
  labels: Messages["articles"];
}) {
  return (
    <p className={styles.meta}>
      {article.area && (
        <>
          <span className="visually-hidden">{labels.area}: </span>
          <Link href={`/${lang}/articles?area=${encodeURIComponent(article.area.slug)}`}>{article.area.name}</Link>
          <span aria-hidden="true"> · </span>
        </>
      )}
      <span className="visually-hidden">{labels.published} </span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, lang)}</time>
    </p>
  );
}
