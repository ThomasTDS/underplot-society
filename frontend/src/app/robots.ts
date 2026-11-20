import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { AI_CRAWLERS_DISALLOWED } from "@/seo/ai-crawlers";
import { getSiteConfig } from "@/seo/site";

/** Read at request time: staging and production run the same build. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteConfig();

  if (!site.indexable || !site.url) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: AI_CRAWLERS_DISALLOWED, disallow: "/" },
      // The fallback notice is the article list again: no need to crawl it twice.
      { userAgent: "*", allow: "/", disallow: "/*?unavailable=" },
    ],
    sitemap: locales.map((locale) => new URL(`/sitemap/${locale}.xml`, site.url!).toString()),
  };
}
