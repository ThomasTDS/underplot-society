import "server-only";
import type { Locale } from "@/i18n/config";
import { DEFAULT_TIMEOUT_MS } from "./api-status";

/**
 * Reads published content from the backend API (server only). Every answer is
 * checked against the expected shape; anything unexpected counts as an error, so a
 * broken or hostile response never reaches the page as if it were content.
 */

export type Area = { slug: string; name: string };
export type Cover = { url: string; alt: string; width: number; height: number };

export type ArticleSummary = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  area: Area | null;
  cover: Cover | null;
};

export type Article = ArticleSummary & {
  /** Sanitized by the API (two layers, see the backend's App\Support\Markdown). */
  bodyHtml: string;
  /** Slug in each language the article is published in. */
  translations: Partial<Record<Locale, string>>;
  seo: { title: string; description: string };
  updatedAt: string | null;
};

export type ArticlePage = {
  items: ArticleSummary[];
  page: number;
  lastPage: number;
  total: number;
};

export type Result<T> = { kind: "ok"; data: T } | { kind: "not-found" } | { kind: "error" };

type FetchFn = (input: URL, init: RequestInit) => Promise<Response>;

export type ContentOptions = { baseUrl?: string; fetchFn?: FetchFn; timeoutMs?: number };

export async function listArticles(
  locale: Locale,
  query: { area?: string; page?: number; perPage?: number } = {},
  options?: ContentOptions,
): Promise<Result<ArticlePage>> {
  const params = new URLSearchParams();
  if (query.area) params.set("area", query.area);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.perPage) params.set("per_page", String(query.perPage));

  // An unknown area or page number is a 422 from the API: for the reader, not found.
  return request(`/api/v1/${locale}/articles?${params}`, parseArticlePage, options, [404, 422]);
}

export async function getArticle(locale: Locale, slug: string, options?: ContentOptions): Promise<Result<Article>> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
    return { kind: "not-found" };
  }
  return request(`/api/v1/${locale}/articles/${slug}`, (body) => parseArticle(data(body)), options, [404]);
}

export async function listAreas(locale: Locale, options?: ContentOptions): Promise<Result<Area[]>> {
  return request(`/api/v1/${locale}/areas`, (body) => list(data(body), parseArea), options, []);
}

async function request<T>(
  path: string,
  parse: (body: unknown) => T | null,
  { baseUrl = process.env.API_BASE_URL, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: ContentOptions = {},
  notFoundStatuses: number[],
): Promise<Result<T>> {
  const url = apiUrl(baseUrl, path);
  if (!url) return { kind: "error" };

  try {
    const response = await fetchFn(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (notFoundStatuses.includes(response.status)) return { kind: "not-found" };
    if (response.status !== 200) return { kind: "error" };

    const parsed = parse(await response.json());
    return parsed === null ? { kind: "error" } : { kind: "ok", data: parsed };
  } catch {
    return { kind: "error" };
  }
}

function apiUrl(baseUrl: string | undefined, path: string): URL | null {
  try {
    const base = new URL(baseUrl?.trim() ?? "");
    return base.protocol === "http:" || base.protocol === "https:" ? new URL(path, base) : null;
  } catch {
    return null;
  }
}

// Shape checks.

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function data(body: unknown): unknown {
  return isObj(body) ? body.data : null;
}

function list<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map(parse);
  return items.every((item) => item !== null) ? (items as T[]) : null;
}

function parseArea(value: unknown): Area | null {
  if (!isObj(value)) return null;
  const slug = str(value.slug);
  const name = str(value.name);
  return slug && name ? { slug, name } : null;
}

function parseCover(value: unknown): Cover | null {
  if (!isObj(value)) return null;
  const url = str(value.url);
  const alt = str(value.alt);
  const { width, height } = value;
  if (!url || alt === null || typeof width !== "number" || typeof height !== "number") return null;
  // Only web URLs may become an image source.
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, alt, width, height };
}

function parseSummary(value: unknown): ArticleSummary | null {
  if (!isObj(value)) return null;
  const slug = str(value.slug);
  const title = str(value.title);
  const summary = str(value.summary);
  const publishedAt = str(value.published_at);
  if (!slug || !title || summary === null || !publishedAt) return null;

  const area = value.area === null ? null : parseArea(value.area);
  const cover = value.cover === null ? null : parseCover(value.cover);
  if ((value.area !== null && !area) || (value.cover !== null && !cover)) return null;

  return { slug, title, summary, publishedAt, area, cover };
}

function parseArticle(value: unknown): Article | null {
  const summary = parseSummary(value);
  if (!summary || !isObj(value)) return null;
  const bodyHtml = str(value.body_html);
  if (bodyHtml === null || !isObj(value.translations) || !isObj(value.seo)) return null;
  const seoTitle = str(value.seo.title);
  const seoDescription = str(value.seo.description);
  if (!seoTitle || seoDescription === null) return null;
  const updatedAt = value.updated_at === null ? null : str(value.updated_at);
  if (updatedAt === null && value.updated_at !== null) return null;

  const translations: Partial<Record<Locale, string>> = {};
  for (const [locale, slug] of Object.entries(value.translations)) {
    if (typeof slug !== "string") return null;
    if (locale === "en" || locale === "pt-br" || locale === "es") translations[locale] = slug;
  }
  return { ...summary, bodyHtml, translations, seo: { title: seoTitle, description: seoDescription }, updatedAt };
}

function parseArticlePage(body: unknown): ArticlePage | null {
  if (!isObj(body) || !isObj(body.meta)) return null;
  const items = list(body.data, parseSummary);
  const { current_page: page, last_page: lastPage, total } = body.meta;
  if (!items || typeof page !== "number" || typeof lastPage !== "number" || typeof total !== "number") return null;
  return { items, page, lastPage, total };
}
