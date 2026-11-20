/**
 * Where the site lives and whether search engines may index it. Pure, so the proxy
 * can use it too. Read at request time, not build time: the same image runs on
 * staging (never indexed) and in production.
 *
 * - SITE_URL: the public origin, e.g. https://underplotsociety.com.br. Needed for
 *   canonical, hreflang, sitemap and share links, which must be absolute.
 * - SITE_INDEXING=on: only in production. Anything else, or a missing SITE_URL,
 *   keeps the site out of search engines.
 */
export type SiteConfig = { url: URL | null; indexable: boolean };

export function siteConfigFrom(env: Record<string, string | undefined>): SiteConfig {
  const url = parseOrigin(env.SITE_URL);
  return { url, indexable: url !== null && env.SITE_INDEXING === "on" };
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}
