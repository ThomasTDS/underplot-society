/**
 * The newsletter lives on Substack; the site only links to it. The address
 * comes from NEWSLETTER_URL, read at request time. Until it is set, or if it is not
 * an https address, nothing about the newsletter is shown.
 */
export function newsletterUrlFrom(env: Record<string, string | undefined>): string | null {
  const value = env.NEWSLETTER_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
