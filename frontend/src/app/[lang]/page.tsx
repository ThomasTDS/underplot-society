import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArticleList, ArticlesUnavailable } from "@/components/articles/ArticleList";
import { ApiStatus, ApiStatusPending, type ApiStatusLabels } from "@/components/ApiStatus";
import { getApiStatus } from "@/lib/api-status";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/dictionaries";
import { listArticles } from "@/lib/content-api";
import { baseMetadata, pageAlternates, samePathInEveryLanguage, SITE_NAME } from "@/seo/metadata";
import { getSiteConfig } from "@/seo/site";
import styles from "./page.module.css";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const site = await getSiteConfig();
  const base = baseMetadata(site, lang, getMessages(lang).home.tagline);

  return {
    ...base,
    title: { absolute: `${SITE_NAME}: ${getMessages(lang).home.tagline}` },
    // x-default: "/" picks the reader's language.
    alternates: pageAlternates(site, `/${lang}`, samePathInEveryLanguage(""), "/"),
    openGraph: { ...base.openGraph, url: `/${lang}` },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const messages = getMessages(lang);

  return (
    <div className={styles.main}>
      <h1 className={styles.title}>Underplot Society</h1>
      <p className={styles.tagline}>{messages.home.tagline}</p>

      <section aria-labelledby="latest-articles" className={styles.section}>
        <h2 id="latest-articles" className={styles.heading}>
          {messages.articles.latest}
        </h2>
        <Suspense fallback={<p>{messages.articles.loading}</p>}>
          <LatestArticles lang={lang} labels={messages.articles} />
        </Suspense>
        <Link href={`/${lang}/articles`}>{messages.articles.all}</Link>
      </section>

      <section aria-labelledby="system-status" className={styles.section}>
        <h2 id="system-status" className={styles.heading}>
          {messages.status.heading}
        </h2>
        <Suspense fallback={<ApiStatusPending labels={messages.status} />}>
          <LiveApiStatus labels={messages.status} />
        </Suspense>
      </section>
    </div>
  );
}

async function LatestArticles({ lang, labels }: { lang: Locale; labels: Messages["articles"] }) {
  await connection();
  const result = await listArticles(lang, { perPage: 3 });
  if (result.kind !== "ok") return <ArticlesUnavailable labels={labels} />;

  return <ArticleList articles={result.data.items} lang={lang} labels={labels} headingLevel={3} />;
}

async function LiveApiStatus({ labels }: { labels: ApiStatusLabels }) {
  // Checked on every request, never at build time or from a cache.
  await connection();
  const status = await getApiStatus(process.env.API_BASE_URL);

  return <ApiStatus status={status} labels={labels} />;
}
