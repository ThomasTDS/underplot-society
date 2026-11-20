import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@/i18n/dictionaries";
import ErrorPage from "./error";

const params = vi.hoisted(() => ({ current: {} as { lang?: string } }));
vi.mock("next/navigation", () => ({ useParams: () => params.current }));

afterEach(cleanup);

describe("ErrorPage", () => {
  it.each(["en", "pt-br", "es"] as const)("speaks the URL's language (%s)", (lang) => {
    params.current = { lang };
    render(<ErrorPage retry={() => {}} />);
    const text = getMessages(lang).error;
    expect(screen.getByRole("heading", { level: 1, name: text.title })).toBeTruthy();
    expect(screen.getByText(text.body)).toBeTruthy();
    expect(screen.getByRole("link", { name: text.home }).getAttribute("href")).toBe(`/${lang}`);
  });

  it("falls back to English for an unknown language", () => {
    params.current = { lang: "fr" };
    render(<ErrorPage retry={() => {}} />);
    expect(screen.getByRole("link", { name: getMessages("en").error.home }).getAttribute("href")).toBe("/en");
  });

  it("moves focus to the message", () => {
    params.current = { lang: "en" };
    render(<ErrorPage retry={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("tries again on request", () => {
    params.current = { lang: "es" };
    const retry = vi.fn();
    render(<ErrorPage retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: getMessages("es").error.retry }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    params.current = { lang: "pt-br" };
    const { container } = render(<ErrorPage retry={() => {}} />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
