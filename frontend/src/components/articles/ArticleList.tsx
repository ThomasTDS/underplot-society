import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import type { ArticleSummary } from "@/lib/content-api";
import { ArticleCard } from "./ArticleCard";
import styles from "./articles.module.css";

export function ArticleList({
  articles,
  lang,
  labels,
  headingLevel,
}: {
  articles: ArticleSummary[];
  lang: Locale;
  labels: Messages["articles"];
  headingLevel?: 2 | 3;
}) {
  if (articles.length === 0) {
    return <p className={styles.notice}>{labels.empty}</p>;
  }
  return (
    <ul className={styles.list}>
      {articles.map((article) => (
        <li key={article.slug}>
          <ArticleCard article={article} lang={lang} labels={labels} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

/** Said in text and announced to screen readers. */
export function ArticlesUnavailable({ labels }: { labels: Messages["articles"] }) {
  return (
    <p className={styles.notice} role="status" data-content="unavailable">
      {labels.unavailable}
    </p>
  );
}
