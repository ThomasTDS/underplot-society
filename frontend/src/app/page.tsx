import { connection } from "next/server";
import { Suspense } from "react";
import { ApiStatus, ApiStatusPending } from "@/components/ApiStatus";
import { getApiStatus } from "@/lib/api-status";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Underplot Society</h1>
      <p className={styles.tagline}>Beneath the Surface.</p>

      <section aria-labelledby="system-status" className={styles.section}>
        <h2 id="system-status" className={styles.heading}>
          System status
        </h2>
        <Suspense fallback={<ApiStatusPending />}>
          <LiveApiStatus />
        </Suspense>
      </section>
    </main>
  );
}

async function LiveApiStatus() {
  // Checked on every request, never at build time or from a cache.
  await connection();
  const status = await getApiStatus(process.env.API_BASE_URL);

  return <ApiStatus status={status} />;
}
