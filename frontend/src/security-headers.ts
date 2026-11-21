/**
 * Security headers on every response of the site.
 *
 * Content-Security-Policy: everything from the site's own origin only. No other host,
 * no plugins (object), no framing by other sites, no <base> rewriting, no form posting
 * elsewhere.
 *
 * Inline scripts and styles are allowed ('unsafe-inline'). Next streams the page data
 * in inline scripts, and the theme is set by an inline script before the page paints.
 * A nonce would remove the need, but it needs every page rendered per request, which
 * Next documents as incompatible with Partial Prerendering (the static shell and its
 * cache). Defence against script injection rests on the article sanitizer (two
 * independent layers in the backend) and React's escaping; this policy still stops any
 * injected code from loading or sending anything to another host.
 */
const isDev = process.env.NODE_ENV === "development";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // React needs eval in development only, for its error overlay.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** Browser features the site never uses, switched off for it and anything it embeds. */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Permissions-Policy": PERMISSIONS_POLICY,
  // Other sites learn only the origin a reader came from, never the page.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  // For browsers that predate frame-ancestors.
  "X-Frame-Options": "DENY",
  // A page this site opens cannot reach back into it, and the reverse.
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
