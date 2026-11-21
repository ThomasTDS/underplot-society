import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { resolveLocale } from "@/i18n/detect";
import { siteConfigFrom } from "@/seo/config";

/**
 * Send every page request to a locale-prefixed URL.
 *
 * - `/pt-br/...`: served as is.
 * - `/PT-BR/...`: permanent redirect to the lower-case locale.
 * - `/` or `/anything`: temporary redirect to the reader's locale (cookie first,
 *   then `Accept-Language`, then English).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (isLocale(firstSegment)) {
    // An article that does not exist gets a real 404 status. The page itself cannot
    // set it: by the time it knows, the response has started streaming.
    const article = ARTICLE_PATH.exec(pathname);
    // Client-side navigations and prefetches are left to the page, which shows the
    // same message in place.
    if (article && !isClientFetch(request) && (await articleExists(firstSegment, article[1])) === false) {
      const notFound = await notFoundPage(firstSegment);
      if (notFound) return notFound;
    }

    const response = NextResponse.next();
    // Outside production, also keep pages out of search engines by header, which
    // works even for a crawler that ignores robots.txt or reads no HTML.
    if (!siteConfigFrom(process.env).indexable) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }

  const url = request.nextUrl.clone();
  const lowerCased = firstSegment.toLowerCase();

  if (isLocale(lowerCased)) {
    url.pathname = `/${lowerCased}${pathname.slice(firstSegment.length + 1)}`;
    return NextResponse.redirect(url, 308);
  }

  const locale = resolveLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url, 307);
  // The target depends on these request headers, so caches must not share it.
  response.headers.set("Vary", "Accept-Language, Cookie");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * A request the site's own scripts make (a click inside the site, or a prefetch), as
 * opposed to the browser loading a page. Next removes its router headers (rsc,
 * next-router-prefetch) before the proxy runs, so this uses the browser's own Fetch
 * Metadata: a page load is "document", a script's fetch is "empty". Crawlers and
 * tools that send no such header are treated as page loads, and get the real 404.
 */
function isClientFetch(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-dest") === "empty";
}

const ARTICLE_PATH = /^\/[^/]+\/articles\/([^/]+)\/?$/;

/** The site's own server, from inside the container (never through Cloudflare). */
const SELF = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

/**
 * Asks /internal/article-exists, which reads the same tagged cache as the page.
 * null when it cannot tell (timeout, API down): the page then renders as usual.
 */
async function articleExists(locale: string, slug: string): Promise<boolean | null> {
  try {
    const url = new URL("/internal/article-exists", SELF);
    url.searchParams.set("locale", locale);
    url.searchParams.set("slug", slug);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const { exists } = (await response.json()) as { exists?: unknown };
    return typeof exists === "boolean" ? exists : null;
  } catch {
    return null;
  }
}

/** The translated not-found page with a 404 status, or null to let the page render. */
async function notFoundPage(locale: string): Promise<NextResponse | null> {
  try {
    const page = await fetch(new URL(`/${locale}/missing`, SELF), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!page.ok) return null;
    return new NextResponse(await page.text(), {
      status: 404,
      headers: {
        "Content-Type": page.headers.get("content-type") ?? "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return null;
  }
}

export const config = {
  // Pages only: skip Next.js internals, any path that looks like a file, and the
  // server's own /internal/ endpoints.
  matcher: ["/((?!_next/|internal/|.*\\.[A-Za-z0-9]+$).*)"],
};
