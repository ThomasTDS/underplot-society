import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locales } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { SiteHeader } from "./SiteHeader";

const pathname = vi.hoisted(() => ({ current: "/en" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/en";
});

afterEach(() => {
  cleanup();
  document.cookie = "locale=; path=/; max-age=0";
});

describe("SiteHeader", () => {
  it.each(locales)("links the wordmark and Home to the %s home page", (locale) => {
    pathname.current = `/${locale}`;
    const messages = getMessages(locale);
    render(<SiteHeader lang={locale} messages={messages} />);

    expect(screen.getByRole("link", { name: "Underplot Society" }).getAttribute("href")).toBe(`/${locale}`);
    const nav = screen.getByRole("navigation", { name: messages.nav.label });
    const home = within(nav).getByRole("link", { name: messages.nav.home });
    expect(home.getAttribute("href")).toBe(`/${locale}`);
    expect(home.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark Home as current on another page", () => {
    pathname.current = "/en/articles/some-slug";
    render(<SiteHeader lang="en" messages={getMessages("en")} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Home" }).hasAttribute("aria-current")).toBe(false);
  });

  it("offers the same page in every language, each name in its own language", () => {
    pathname.current = "/pt-br/articles/some-slug";
    render(<SiteHeader lang="pt-br" messages={getMessages("pt-br")} />);
    const nav = screen.getByRole("navigation", { name: "Idioma" });

    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("lang")])).toEqual([
      ["English", "/en/articles/some-slug", "en"],
      ["Português", "/pt-br/articles/some-slug", "pt-BR"],
      ["Español", "/es/articles/some-slug", "es"],
    ]);
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([null, "true", null]);
  });

  it("remembers the chosen language in the locale cookie", () => {
    render(<SiteHeader lang="en" messages={getMessages("en")} />);
    const link = within(screen.getByRole("navigation", { name: "Language" })).getByRole("link", { name: "Español" });
    link.addEventListener("click", (event) => event.preventDefault()); // jsdom cannot navigate

    fireEvent.click(link);
    expect(document.cookie).toContain("locale=es");
  });

  it("has no detectable accessibility problems", async () => {
    const { container } = render(<SiteHeader lang="en" messages={getMessages("en")} />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
