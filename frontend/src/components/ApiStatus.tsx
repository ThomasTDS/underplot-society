import type { ApiStatus as Status } from "@/lib/api-status";
import type { Messages } from "@/i18n/dictionaries";
import styles from "./ApiStatus.module.css";

export type ApiStatusLabels = Messages["status"];

/**
 * Shows the API status as text. The coloured marker is decorative only.
 */
export function ApiStatus({ status, labels }: { status: Status; labels: ApiStatusLabels }) {
  return (
    <p className={styles.status} data-status={status}>
      <span className={styles.marker} aria-hidden="true" />
      <span>
        {labels.label} <strong>{labels[status]}</strong>
      </span>
    </p>
  );
}

export function ApiStatusPending({ labels }: { labels: ApiStatusLabels }) {
  return (
    <p className={styles.status} data-status="pending">
      <span className={styles.marker} aria-hidden="true" />
      <span>{labels.checking}</span>
    </p>
  );
}
