import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AreaFilter } from "@/components/articles/AreaFilter";
import { ArticleList, ArticlesUnavailable } from "@/components/articles/ArticleList";
import { Pagination } from "@/components/articles/Pagination";
import styles from "@/components/articles/articles.module.css";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/dictionaries";
import { listAreas, listArticles } from "@/lib/content-api";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function ArticlesPage({ params, searchParams }: PageProps<"/[lang]/articles">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const labels = getMessages(lang).articles;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{labels.heading}</h1>
      <Suspense fallback={<p className={styles.notice}>{labels.loading}</p>}>
        <Articles lang={lang} labels={labels} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Articles({
  lang,
  labels,
  searchParams,
}: {
  lang: Locale;
  labels: Messages["articles"];
  searchParams: PageProps<"/[lang]/articles">["searchParams"];
}) {
  const query = await searchParams;
  const area = typeof query.area === "string" ? query.area : undefined;
  const pageParam = typeof query.page === "string" ? query.page : undefined;
  if ((area !== undefined && !SLUG.test(area)) || (pageParam !== undefined && !/^[1-9]\d{0,3}$/.test(pageParam))) {
    notFound();
  }
  const page = pageParam ? Number(pageParam) : 1;

  const [articles, areas] = await Promise.all([listArticles(lang, { area, page }), listAreas(lang)]);
  if (articles.kind === "not-found") notFound();
  if (articles.kind === "error") return <ArticlesUnavailable labels={labels} />;
  if (page > articles.data.lastPage && page > 1) notFound();

  const href = (target: number) => {
    const search = new URLSearchParams();
    if (area) search.set("area", area);
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return `/${lang}/articles${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {areas.kind === "ok" && areas.data.length > 0 && (
        <AreaFilter areas={areas.data} current={area} lang={lang} labels={labels} />
      )}
      <ArticleList articles={articles.data.items} lang={lang} labels={labels} />
      <Pagination page={articles.data.page} lastPage={articles.data.lastPage} href={href} labels={labels} />
    </>
  );
}
