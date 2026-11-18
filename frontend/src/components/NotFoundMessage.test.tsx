import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@/i18n/dictionaries";
import { NotFoundMessage } from "./NotFoundMessage";

const params = vi.hoisted(() => ({ current: {} as { lang?: string } }));
vi.mock("next/navigation", () => ({ useParams: () => params.current }));

afterEach(cleanup);

describe("NotFoundMessage", () => {
  it.each(["en", "pt-br", "es"] as const)("speaks the URL's language (%s)", (lang) => {
    params.current = { lang };
    render(<NotFoundMessage />);
    const text = getMessages(lang).notFound;
    expect(screen.getByRole("heading", { level: 1, name: text.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: text.home }).getAttribute("href")).toBe(`/${lang}`);
  });

  it("falls back to English for an unknown language", () => {
    params.current = { lang: "fr" };
    render(<NotFoundMessage />);
    expect(screen.getByRole("link", { name: getMessages("en").notFound.home }).getAttribute("href")).toBe("/en");
  });
});
