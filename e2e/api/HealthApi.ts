import type { APIRequestContext, APIResponse } from "@playwright/test";

export const HEALTH_PATH = "/api/health";

export type HealthBody =
  | { status: "ok" }
  | { status: "error"; error: "database_unavailable" };

/**
 * Client for the health check endpoint: the API counterpart of a page object.
 */
export class HealthApi {
  constructor(private readonly request: APIRequestContext) {}

  check(): Promise<APIResponse> {
    return this.request.get(HEALTH_PATH, { headers: { Accept: "application/json" } });
  }

  send(method: "POST" | "PUT" | "PATCH" | "DELETE"): Promise<APIResponse> {
    return this.request.fetch(HEALTH_PATH, {
      method,
      headers: { Accept: "application/json" },
    });
  }

  /** Time a health check, in milliseconds. */
  async timedCheck(): Promise<{ response: APIResponse; elapsedMs: number }> {
    const start = performance.now();
    const response = await this.check();
    return { response, elapsedMs: performance.now() - start };
  }
}
