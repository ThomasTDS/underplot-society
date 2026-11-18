import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Item 7.1: every text and component pairing meets WCAG 2.2 AA in both themes.
 * Reads tokens.css itself, so the file the site ships is the file that is checked.
 */

// Tests run from the frontend directory (npm test).
const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`No block for ${selector}`);
  return Object.fromEntries(
    [...match[1].matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()]),
  );
}

const dark = block(":root");
const light = { ...dark, ...block(':root[data-theme="light"]') };
const themes = { dark, light };

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ["color-bg", "color-surface", "color-raised"];
const TEXT = 4.5; // normal text
const NON_TEXT = 3; // component edges, focus indicator, status markers

/** [foreground, minimum ratio], checked against every surface. */
const ON_SURFACES: [string, number][] = [
  ["color-text", TEXT],
  ["color-text-muted", TEXT],
  ["color-link", TEXT],
  ["color-accent", TEXT],
  ["color-success", TEXT],
  ["color-danger", TEXT],
  ["color-border", NON_TEXT],
  ["color-focus", NON_TEXT],
];

for (const [name, theme] of Object.entries(themes)) describe(`${name} theme`, () => {
  it.each(ON_SURFACES.flatMap(([fg, min]) => SURFACES.map((bg) => [fg, bg, min] as const)))(
    "%s on %s reaches %s:1",
    (fg, bg, min) => {
      expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
    },
  );

  it("button text on the button reaches 4.5:1", () => {
    expect(contrast(theme["color-button-text"], theme["color-button"])).toBeGreaterThanOrEqual(TEXT);
  });

  it("the button stands out from the page by 3:1", () => {
    expect(contrast(theme["color-button"], theme["color-bg"])).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe("token sets", () => {
  it("the light theme redefines every color the dark theme defines", () => {
    expect(Object.keys(block(':root[data-theme="light"]')).sort()).toEqual(Object.keys(dark).sort());
  });

  it("the contrast function matches known WCAG values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});

describe("components use tokens", () => {
  const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".css") && !file.endsWith("tokens.css"),
  );

  it("finds the stylesheets", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has no literal colors", (file) => {
    expect(readFileSync(join(SRC, file), "utf8")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });
});
