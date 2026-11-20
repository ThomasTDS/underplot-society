/**
 * Audience metrics without cookies or personal data. When a page is shown, the site's
 * server tells the API which page it was; the API keeps only a daily total per page
 * (no address, user agent or identifier, and nothing in the browser). See
 * src/components/PageViewCounter.tsx and the backend's PageViewController.
 *
 * Counted: a page a person opens, by a full load or a click inside the site.
 * Not counted: prefetches (they never render the page's request-time part), bots and
 * crawlers, and anything that is not one of the site's pages.
 */

/** The same list of pages the API accepts (PageView::PATH in the backend). */
const PAGE = /^\/(en|pt-br|es)(?:\/(?:articles(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|about|privacy|accessibility))?$/;

/** Bots, crawlers, link previews, monitors and scripts, by their usual names. */
const NOT_A_PERSON =
  /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|scan|curl|wget|python|java\/|go-http|node|axios|okhttp|facebookexternalhit|embedly|whatsapp|telegram/i;

/** The page to count for this path, or null. A trailing slash is ignored. */
export function countablePath(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return path.length <= 200 && PAGE.test(path) ? path : null;
}

/** Whether a request comes from a person's browser (not a bot, script or prerender). */
export function isPerson(headers: Headers): boolean {
  const userAgent = headers.get("user-agent") ?? "";
  if (!userAgent || NOT_A_PERSON.test(userAgent)) return false;

  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`.toLowerCase();
  return !purpose.includes("prefetch") && !purpose.includes("prerender");
}

type Options = { baseUrl?: string; secret?: string; fetchFn?: typeof fetch };

/**
 * Sends one view to the API. Never throws and never delays the page: the caller runs
 * it after the response (with after()). Off without the API address or the shared secret.
 */
export async function recordPageView(
  path: string,
  { baseUrl = process.env.API_BASE_URL, secret = process.env.REVALIDATE_SECRET, fetchFn = fetch }: Options = {},
): Promise<void> {
  if (!baseUrl || !secret || secret.length < 32) return;
  try {
    await fetchFn(new URL("/api/internal/page-views", baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ path }),
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // A lost count is better than a slow or failed page.
  }
}
