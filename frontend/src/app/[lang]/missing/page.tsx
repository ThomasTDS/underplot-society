import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { NotFoundMessage } from "@/components/NotFoundMessage";

/**
 * The translated "not found" page, inside the site layout. The proxy serves it with
 * a real 404 status for an article that does not exist (see proxy.ts): a page
 * cannot change its own status once it has started streaming.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Missing() {
  return (
    <>
      <NotFoundMessage />
      {/* The layout's metadata is read per request (site URL, indexing); with no
          other request-time part, the page needs this marker to say so. */}
      <Suspense>
        <RequestTime />
      </Suspense>
    </>
  );
}

async function RequestTime() {
  await connection();
  return null;
}
