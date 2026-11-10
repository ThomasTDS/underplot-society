import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { resolveLocale } from "@/i18n/detect";

/**
 * Send every page request to a locale-prefixed URL.
 *
 * - `/pt-br/...`: served as is.
 * - `/PT-BR/...`: permanent redirect to the lower-case locale.
 * - `/` or `/anything`: temporary redirect to the reader's locale (cookie first,
 *   then `Accept-Language`, then English).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (isLocale(firstSegment)) {
    return NextResponse.next();
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

export const config = {
  // Pages only: skip Next.js internals and any path that looks like a file.
  matcher: ["/((?!_next/|.*\\.[A-Za-z0-9]+$).*)"],
};
