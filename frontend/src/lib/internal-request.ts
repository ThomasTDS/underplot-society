import { timingSafeEqual } from "node:crypto";

/**
 * Requests to /internal/* come from inside the server: the backend container, or
 * the site's own proxy. Cloudflare adds CF-Connecting-IP to every request it
 * forwards, so a request carrying it came from the internet and is refused.
 */
export function cameFromInternet(request: Request): boolean {
  return request.headers.has("cf-connecting-ip");
}

/** Constant-time check of "Authorization: Bearer <secret>". */
export function hasSecret(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
