import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/dictionaries";
import type { Area } from "@/lib/content-api";
import styles from "./articles.module.css";

/** Plain links, so the filter works without JavaScript and each filter has its own address. */
export function AreaFilter({
  areas,
  current,
  lang,
  labels,
}: {
  areas: Area[];
  current: string | undefined;
  lang: Locale;
  labels: Messages["articles"];
}) {
  const options = [{ slug: undefined, name: labels.allAreas }, ...areas];

  return (
    <nav aria-label={labels.filterLabel}>
      <ul className={styles.filter}>
        {options.map(({ slug, name }) => (
          <li key={slug ?? ""}>
            <Link
              href={slug ? `/${lang}/articles?area=${encodeURIComponent(slug)}` : `/${lang}/articles`}
              aria-current={slug === current ? "page" : undefined}
              className={styles.filterLink}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
