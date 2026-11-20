import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleMeta } from "@/components/articles/ArticleCard";
import { ArticlesUnavailable } from "@/components/articles/ArticleList";
import { LanguageAlternates } from "@/components/articles/LanguageAlternates";
import styles from "@/components/articles/articles.module.css";
import { articleAlternates } from "@/i18n/article-alternates";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/dictionaries";
import { getArticle } from "@/lib/content-api";
import { baseMetadata, pageAlternates } from "@/seo/metadata";
import { getSiteConfig } from "@/seo/site";

// One API call per request, shared by the metadata and the page.
const loadArticle = cache((lang: Locale, slug: string) => getArticle(lang, slug));

export async function generateMetadata({ params }: PageProps<"/[lang]/articles/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const site = await getSiteConfig();
  const result = await loadArticle(lang, slug);
  if (result.kind !== "ok") {
    return { robots: { index: false, follow: false } };
  }

  const article = result.data;
  const base = baseMetadata(site, lang, article.seo.description);
  const canonical = `/${lang}/articles/${article.slug}`;
  const paths = Object.fromEntries(
    Object.entries(article.translations).map(([locale, translated]) => [locale, `/${locale}/articles/${translated}`]),
  );

  return {
    ...base,
    title: article.seo.title,
    // x-default: the English version, if there is one.
    alternates: pageAlternates(site, canonical, paths, paths.en),
    openGraph: {
      ...base.openGraph,
      type: "article",
      url: canonical,
      title: article.seo.title,
      description: article.seo.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? undefined,
      section: article.area?.name,
      ...(article.cover
        ? { images: [{ url: article.cover.url, width: article.cover.width, height: article.cover.height, alt: article.cover.alt }] }
        : {}),
    },
  };
}

/** Rendered inside the layout's Suspense boundary: the slug is request-time data. */
export default async function ArticlePage({ params }: PageProps<"/[lang]/articles/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  return <ArticleContent lang={lang} slug={slug} labels={getMessages(lang).articles} />;
}

async function ArticleContent({ lang, slug, labels }: { lang: Locale; slug: string; labels: Messages["articles"] }) {
  const result = await loadArticle(lang, slug);
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
