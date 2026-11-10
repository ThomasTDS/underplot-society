import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import type { ApiStatus as Status } from "@/lib/api-status";
import { ApiStatus, ApiStatusPending } from "./ApiStatus";

afterEach(cleanup);

const statuses: Status[] = ["operational", "degraded", "unreachable"];
const labels = getMessages("en").status;

async function accessibilityViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    // Colour contrast needs real layout and styles, which jsdom does not compute.
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("ApiStatus", () => {
  it.each(locales.flatMap((locale) => statuses.map((status) => [locale, status] as const)))(
    "states the %s %s status in text, not only by colour",
    (locale, status) => {
      const localized = getMessages(locale).status;
      render(<ApiStatus status={status} labels={localized} />);

      expect(screen.getByText(localized[status])).toBeTruthy();
      expect(screen.getByText(localized.label, { exact: false }).textContent).toBe(
        `${localized.label} ${localized[status]}`,
      );
    },
  );

  it("hides the coloured marker from assistive technology", () => {
    const { container } = render(<ApiStatus status="operational" labels={labels} />);

    const marker = container.querySelector("span[aria-hidden='true']");
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toBe("");
  });

  it.each(statuses)("has no accessibility violations when %s", async (status) => {
    const { container } = render(<ApiStatus status={status} labels={labels} />);

    expect(await accessibilityViolations(container)).toEqual([]);
  });
});

describe("ApiStatusPending", () => {
  it.each(locales)("tells the reader the status is being checked (%s)", async (locale) => {
    const localized = getMessages(locale).status;
    const { container } = render(<ApiStatusPending labels={localized} />);

    expect(screen.getByText(localized.checking)).toBeTruthy();
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
