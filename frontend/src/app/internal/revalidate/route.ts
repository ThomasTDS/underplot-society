import { revalidateTag } from "next/cache";
import { isContentTag } from "@/lib/content-tags";
import { cameFromInternet, hasSecret } from "@/lib/internal-request";

const MAX_TAGS = 100;

/**
 * Called by the backend after content changes in the panel:
 * POST { "tags": ["articles:en", "article:en:my-slug", ...] }
 * with "Authorization: Bearer $REVALIDATE_SECRET". The next visit to an affected
 * page reads fresh data. Answers 404 to anything else, to reveal nothing.
 */
export async function POST(request: Request) {
  if (cameFromInternet(request) || !hasSecret(request, process.env.REVALIDATE_SECRET)) {
    return new Response(null, { status: 404 });
  }

  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown }).tags;
  } catch {
    return Response.json({ message: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS || !tags.every(isContentTag)) {
    return Response.json({ message: "Expected 1 to 100 known content tags." }, { status: 422 });
  }

  const unique = [...new Set(tags)];
  // expire: 0 drops the data at once: the next visitor never sees the old version.
  unique.forEach((tag) => revalidateTag(tag, { expire: 0 }));
  return Response.json({ revalidated: unique });
}
