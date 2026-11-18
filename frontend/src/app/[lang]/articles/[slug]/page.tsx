import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleMeta } from "@/components/articles/ArticleCard";
import { ArticlesUnavailable } from "@/components/articles/ArticleList";
import { LanguageAlternates } from "@/components/articles/LanguageAlternates";
import styles from "@/components/articles/articles.module.css";
import { articleAlternates } from "@/i18n/article-alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/dictionaries";
import { getArticle } from "@/lib/content-api";

/** Rendered inside the layout's Suspense boundary: the slug is request-time data. */
export default async function ArticlePage({ params }: PageProps<"/[lang]/articles/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  return <ArticleContent lang={lang} slug={slug} labels={getMessages(lang).articles} />;
}

async function ArticleContent({ lang, slug, labels }: { lang: Locale; slug: string; labels: Messages["articles"] }) {
  const result = await getArticle(lang, slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") {
    return (
      <div className={styles.article}>
        <ArticlesUnavailable labels={labels} />
      </div>
    );
  }

  const article = result.data;
  const alternates = articleAlternates(article.translations);

  return (
    <article className={styles.article}>
      <LanguageAlternates paths={alternates} />
      <h1 className={styles.articleTitle}>{article.title}</h1>
      <ArticleMeta article={article} lang={lang} labels={labels} />
      {article.summary && <p className={styles.lead}>{article.summary}</p>}
      {article.cover && (
        // A plain <img>: covers are already resized WebP files from the backend.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover.url}
          alt={article.cover.alt}
          width={article.cover.width}
          height={article.cover.height}
          className={styles.cover}
        />
      )}
      <ArticleBody html={article.bodyHtml} />
    </article>
  );
}
