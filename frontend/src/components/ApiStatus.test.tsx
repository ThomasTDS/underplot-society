import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import type { ApiStatus as Status } from "@/lib/api-status";
import { ApiStatus, ApiStatusPending } from "./ApiStatus";

afterEach(cleanup);

async function accessibilityViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    // Colour contrast needs real layout and styles, which jsdom does not compute.
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("ApiStatus", () => {
  it.each<[Status, string]>([
    ["operational", "Operational"],
    ["degraded", "Degraded: the database is unavailable"],
    ["unreachable", "Unreachable"],
  ])("states the %s status in text, not only by colour", (status, label) => {
    render(<ApiStatus status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(/API status:/).textContent).toBe(`API status: ${label}`);
  });

  it("hides the coloured marker from assistive technology", () => {
    const { container } = render(<ApiStatus status="operational" />);

    const marker = container.querySelector("span[aria-hidden='true']");
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toBe("");
  });

  it.each<Status>(["operational", "degraded", "unreachable"])(
    "has no accessibility violations when %s",
    async (status) => {
      const { container } = render(<ApiStatus status={status} />);

      expect(await accessibilityViolations(container)).toEqual([]);
    },
  );
});

describe("ApiStatusPending", () => {
  it("tells the reader the status is being checked", async () => {
    const { container } = render(<ApiStatusPending />);

    expect(screen.getByText("Checking API status…")).toBeTruthy();
    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
