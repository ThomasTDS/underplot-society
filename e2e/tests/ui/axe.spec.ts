import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { locales } from "../../support/locales";

/**
 * Item 9.2: axe on every main page, in every language, in both themes, at phone and
 * desktop widths. A serious or critical violation fails the test (and CI); minor
 * and moderate ones are attached to the report and listed as annotations, to fix
 * without blocking a merge.
 *
 * Unlike the unit tests, this runs in a real browser, so axe also checks the colour
 * contrast of the final, rendered page.
 */

const articleSlug = {
  en: "sample-reading-the-fine-print",
  "pt-br": "exemplo-lendo-as-letras-miudas",
  es: "ejemplo-leyendo-la-letra-pequena",
} as const;
const area = { en: "culture", "pt-br": "cultura", es: "cultura" } as const;

const pages = [
  ...locales.flatMap((locale) => [
    { name: `home (${locale})`, path: `/${locale}` },
    { name: `article list (${locale})`, path: `/${locale}/articles` },
    { name: `filtered list (${locale})`, path: `/${locale}/articles?area=${area[locale]}` },
    { name: `language fallback (${locale})`, path: `/${locale}/articles?unavailable=article` },
    { name: `article (${locale})`, path: `/${locale}/articles/${articleSlug[locale]}` },
    { name: `article not found (${locale})`, path: `/${locale}/articles/no-such-article` },
  ]),
  { name: "page not found (all languages)", path: "/no-such-page" },
];

const views = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "phone", viewport: { width: 360, height: 740 } },
] as const;

const BLOCKING = new Set(["serious", "critical"]);

for (const theme of ["dark", "light"] as const) {
  for (const view of views) {
    test.describe(`axe, ${theme} theme, ${view.name}`, () => {
      test.use({ colorScheme: theme, viewport: view.viewport });

      for (const { name, path } of pages) {
        test(name, async ({ page }, testInfo) => {
          await page.goto(path);
          await page.waitForLoadState("networkidle");

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();

          await testInfo.attach("axe-results.json", {
            body: JSON.stringify(results.violations, null, 2),
            contentType: "application/json",
          });

          const describe = (v: (typeof results.violations)[number]) =>
            `${v.impact}: ${v.id} (${v.help}) at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`;

          for (const v of results.violations.filter((v) => !BLOCKING.has(v.impact ?? ""))) {
            testInfo.annotations.push({ type: "axe (non-blocking)", description: describe(v) });
          }

          const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? "")).map(describe);
          expect(blocking, "serious or critical accessibility violations").toEqual([]);

          // Contrast that axe could not work out (for example over an image) would pass
          // unchecked; it must be checked, so it counts as a failure.
          const uncheckedContrast = results.incomplete
            .filter((v) => v.id === "color-contrast" || v.id === "color-contrast-enhanced")
            .flatMap((v) => v.nodes.map((n) => n.target.join(" ")));
          expect(uncheckedContrast, "text whose contrast axe could not check").toEqual([]);
          expect(results.passes.some((v) => v.id === "color-contrast"), "axe checked the contrast of the text").toBe(true);
        });
      }
    });
  }
}
