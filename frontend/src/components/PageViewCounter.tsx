import { after, connection } from "next/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { countablePath, isPerson, recordPageView } from "@/lib/page-views";

/**
 * Counts one view of the page it is placed on, after the response, and renders
 * nothing. It is request-time content: it runs when someone opens the page (full load
 * or a click inside the site), never for a prefetch, which only fetches the static
 * part of a page. No script runs in the browser and nothing is stored there.
 */
export function PageViewCounter({ path }: { path: string }) {
  return (
    <Suspense fallback={null}>
      <Count path={path} />
    </Suspense>
  );
}

async function Count({ path }: { path: string }) {
  await connection();
  const page = countablePath(path);
  if (page && isPerson(await headers())) {
    after(() => recordPageView(page));
  }
  return null;
}
