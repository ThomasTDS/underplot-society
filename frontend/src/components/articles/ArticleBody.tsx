import styles from "./articles.module.css";

/**
 * The article body. The HTML comes from the API already sanitized by two
 * independent layers (escaped raw HTML, then an allow-list sanitizer; see the
 * backend's App\Support\Markdown), so it is inserted as is. Nothing else on the
 * site inserts HTML: titles, summaries and names are always rendered as text.
 */
export function ArticleBody({ html }: { html: string }) {
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
