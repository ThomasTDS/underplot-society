import type { ApiStatus as Status } from "@/lib/api-status";
import styles from "./ApiStatus.module.css";

const LABELS: Record<Status, string> = {
  operational: "Operational",
  degraded: "Degraded: the database is unavailable",
  unreachable: "Unreachable",
};

/**
 * Shows the API status as text. The coloured marker is decorative only.
 */
export function ApiStatus({ status }: { status: Status }) {
  return (
    <p className={styles.status} data-status={status}>
      <span className={styles.marker} aria-hidden="true" />
      <span>
        API status: <strong>{LABELS[status]}</strong>
      </span>
    </p>
  );
}

export function ApiStatusPending() {
  return (
    <p className={styles.status} data-status="pending">
      <span className={styles.marker} aria-hidden="true" />
      <span>Checking API status…</span>
    </p>
  );
}
