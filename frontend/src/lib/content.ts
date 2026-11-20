import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/i18n/config";
import { getArticle, listAreas, listArticles, type Area, type Article, type ArticlePage, type Result } from "./content-api";
import { contentTags } from "./content-tags";

/**
 * Content as the pages read it: cached in the site's server, tagged, and dropped on
 * demand when the panel changes something (POST /internal/revalidate, sent by the
 * backend). Entries also refresh on their own every few minutes, which is what
 * makes scheduled articles appear without any event.
 *
 * A failed API call is never cached: it is thrown inside the cached function, so
 * the next request tries again, and turned into { kind: "error" } outside it.
 */

const CONTENT_LIFE = {
  stale: 60, // a browser may reuse a page for a minute
  revalidate: 300, // refreshed in the background after 5 minutes (scheduled articles)
  expire: 3600, // never served if older than an hour
};

class Unavailable extends Error {}

function cachedOrThrow<T>(result: Result<T>): Result<T> {
  if (result.kind === "error") throw new Unavailable();
  return result;
}

async function cachedArticles(locale: Locale, area: string | undefined, page: number, perPage: number | undefined) {
  "use cache";
  cacheLife(CONTENT_LIFE);
  cacheTag(...contentTags.list(locale));
  return cachedOrThrow(await listArticles(locale, { area, page, perPage }));
}

async function cachedArticle(locale: Locale, slug: string) {
  "use cache";
  cacheLife(CONTENT_LIFE);
  // Tagged by slug even when not found, so publishing that slug drops the miss.
  cacheTag(...contentTags.article(locale, slug));
  return cachedOrThrow(await getArticle(locale, slug));
}

async function cachedAreas(locale: Locale) {
  "use cache";
  cacheLife(CONTENT_LIFE);
  cacheTag(...contentTags.areas(locale));
  return cachedOrThrow(await listAreas(locale));
}

async function orError<T>(load: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await load();
  } catch {
    return { kind: "error" };
  }
}

export function loadArticles(
  locale: Locale,
  query: { area?: string; page?: number; perPage?: number } = {},
): Promise<Result<ArticlePage>> {
  return orError(() => cachedArticles(locale, query.area, query.page ?? 1, query.perPage));
}

export function loadArticle(locale: Locale, slug: string): Promise<Result<Article>> {
  return orError(() => cachedArticle(locale, slug));
}

export function loadAreas(locale: Locale): Promise<Result<Area[]>> {
  return orError(() => cachedAreas(locale));
}
