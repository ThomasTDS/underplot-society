import type { Locator, Page } from "@playwright/test";
import { messages, type Locale } from "../support/locales";

export type ApiStatus = "operational" | "degraded" | "unreachable";

/**
 * The localized home page: /en, /pt-br or /es.
 */
export class HomePage {
  readonly heading: Locator;
  readonly statusRegion: Locator;
  readonly apiStatus: Locator;

  constructor(
    private readonly page: Page,
    readonly locale: Locale,
  ) {
    const text = messages[locale];

    this.heading = page.getByRole("heading", { level: 1, name: "Underplot Society" });
    this.statusRegion = page.getByRole("region", { name: text.status.heading });
    // The marker element carries the machine-readable status; the text is for people.
    this.apiStatus = this.statusRegion.locator("[data-status]");
  }

  async goto() {
    const response = await this.page.goto(`/${this.locale}`);
    return response;
  }

  /** The visible label for a given status, in this page's language. */
  statusLabel(status: ApiStatus) {
    return messages[this.locale].status[status];
  }
}
