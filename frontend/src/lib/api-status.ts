/**
 * What the public site can say about the backend API.
 *
 * - `operational`: the API answered and its database is reachable.
 * - `degraded`: the API answered, but reported its database as unavailable.
 * - `unreachable`: no usable answer (not configured, network error, timeout,
 *   unexpected status or an unexpected body).
 */
export type ApiStatus = "operational" | "degraded" | "unreachable";

export const DEFAULT_TIMEOUT_MS = 5000;

type FetchFn = (input: URL, init: RequestInit) => Promise<Response>;

export interface ApiStatusOptions {
  fetchFn?: FetchFn;
  timeoutMs?: number;
}

export async function getApiStatus(
  baseUrl: string | undefined,
  { fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiStatusOptions = {},
): Promise<ApiStatus> {
  const url = healthUrl(baseUrl);
  if (!url) {
    return "unreachable";
  }

  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return "unreachable";
  }

  const body = await readJson(response);

  if (response.status === 200 && isHealthBody(body, "ok")) {
    return "operational";
  }
  if (response.status === 503 && isHealthBody(body, "error")) {
    return "degraded";
  }
  return "unreachable";
}

/**
 * Build the health check URL from the configured API base, accepting only http(s).
 */
export function healthUrl(baseUrl: string | undefined): URL | null {
  if (!baseUrl?.trim()) {
    return null;
  }

  try {
    const base = new URL(baseUrl.trim());
    if (base.protocol !== "http:" && base.protocol !== "https:") {
      return null;
    }
    return new URL("/api/health", base);
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isHealthBody(body: unknown, status: "ok" | "error"): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { status?: unknown }).status === status
  );
}
