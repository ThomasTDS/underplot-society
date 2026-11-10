import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApiStatus, ApiStatusPending, type ApiStatusLabels } from "@/components/ApiStatus";
import { getApiStatus } from "@/lib/api-status";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import styles from "./page.module.css";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const messages = getMessages(lang);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Underplot Society</h1>
      <p className={styles.tagline}>{messages.home.tagline}</p>

      <section aria-labelledby="system-status" className={styles.section}>
        <h2 id="system-status" className={styles.heading}>
          {messages.status.heading}
        </h2>
        <Suspense fallback={<ApiStatusPending labels={messages.status} />}>
          <LiveApiStatus labels={messages.status} />
        </Suspense>
      </section>
    </main>
  );
}

async function LiveApiStatus({ labels }: { labels: ApiStatusLabels }) {
  // Checked on every request, never at build time or from a cache.
  await connection();
  const status = await getApiStatus(process.env.API_BASE_URL);

  return <ApiStatus status={status} labels={labels} />;
}
