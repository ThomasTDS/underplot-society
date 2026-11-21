import type { NextConfig } from "next";
// Next's own list of crawlers that need metadata in <head>. An internal module: if an
// upgrade moves it, the build fails here instead of silently losing the setting.
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";
import { SECURITY_HEADERS } from "./src/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework in response headers.
  poweredByHeader: false,
  // Self-contained server output for the container image.
  output: "standalone",
  // Do not let `next dev` write instruction files into the project.
  agentRules: false,
  // Crawlers on this list get canonical, hreflang and robots in <head>, before the
  // page streams. Googlebot is left out by default because it runs JavaScript; it is
  // added so search does not depend on that (Google ignores a canonical in <body>).
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|Googlebot`, "i"),
  // Security headers on every response (see src/security-headers.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
    ];
  },
  experimental: {
    // The root layout lives under [lang], so unmatched URLs need their own 404 document.
    globalNotFound: true,
  },
};

export default nextConfig;
