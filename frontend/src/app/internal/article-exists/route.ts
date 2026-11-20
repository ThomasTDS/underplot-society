import { isLocale } from "@/i18n/config";
import { loadArticle } from "@/lib/content";
import { cameFromInternet } from "@/lib/internal-request";

/**
 * For the proxy, before an article page starts streaming: does this article exist?
 * Reads the same tagged cache as the page, so it rarely reaches the API, and a
 * publication or removal shows up here at once.
 *
 * 200 { exists: boolean }, or 503 when the API cannot tell (the page then decides).
 */
export async function GET(request: Request) {
  if (cameFromInternet(request)) return new Response(null, { status: 404 });

  const params = new URL(request.url).searchParams;
  const locale = params.get("locale");
  const slug = params.get("slug") ?? "";
  if (!isLocale(locale)) return Response.json({ exists: false });

  const result = await loadArticle(locale, slug);
  if (result.kind === "error") return Response.json({ exists: null }, { status: 503 });
  return Response.json({ exists: result.kind === "ok" });
}
