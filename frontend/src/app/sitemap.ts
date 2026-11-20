import type { MetadataRoute } from "next";
import { htmlLang, locales, type Locale } from "@/i18n/config";
import type { ArticleSummary } from "@/lib/content-api";
import { loadArticles } from "@/lib/content";
import { getSiteConfig } from "@/seo/site";

/** One sitemap per language: /sitemap/en.xml, /sitemap/pt-br.xml, /sitemap/es.xml. */
export async function generateSitemaps() {
  return locales.map((id) => ({ id }));
}

const MAX_PAGES = 200; // 50 per page: 10,000 articles, far beyond what the site will have.

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const locale = (await id) as Locale;
  const site = await getSiteConfig();
  if (!site.url || !site.indexable || !locales.includes(locale)) return [];

  const absolute = (path: string) => new URL(path, site.url!).toString();
  const sameEverywhere = (rest: string) => ({
    languages: Object.fromEntries(locales.map((l) => [htmlLang[l], absolute(`/${l}${rest}`)])),
  });

  const entries: MetadataRoute.Sitemap = [
    { url: absolute(`/${locale}`), alternates: sameEverywhere("") },
    { url: absolute(`/${locale}/articles`), alternates: sameEverywhere("/articles") },
  ];

  for (const article of await allArticles(locale)) {
    entries.push({ url: absolute(`/${locale}/articles/${article.slug}`), lastModified: article.publishedAt });
  }
  return entries;
}

/** Every published article in the language. A failed page ends the list early. */
async function allArticles(locale: Locale): Promise<ArticleSummary[]> {
  const articles: ArticleSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await loadArticles(locale, { page, perPage: 50 });
    if (result.kind !== "ok") break;
    articles.push(...result.data.items);
    if (page >= result.data.lastPage) break;
  }
  return articles;
}
