import Link from "next/link";
import type { Messages } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import styles from "./articles.module.css";

export function Pagination({
  page,
  lastPage,
  href,
  labels,
}: {
  page: number;
  lastPage: number;
  href: (page: number) => string;
  labels: Messages["articles"];
}) {
  if (lastPage <= 1) return null;

  return (
    <nav aria-label={labels.pagination} className={styles.pagination}>
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page">{fill(labels.pageOf, { page, total: lastPage })}</span>
      {page < lastPage ? (
        <Link href={href(page + 1)} rel="next">
          {labels.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
