// Renders the default share image (1200x630) with the site's own fonts and colors.
// Run from the e2e directory against the local stack, then commit the result:
//   node scripts/og-image.mjs ../frontend/public/og-default.png
import { chromium } from "@playwright/test";

const out = process.argv[2];
if (!out) throw new Error("Usage: node scripts/og-image.mjs <output.png>");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: "dark" });
await page.goto(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000/en");
await page.evaluate(() => {
  document.body.innerHTML = `
    <div style="height:630px;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:0 96px;
                background:var(--color-bg);border-bottom:12px solid var(--color-accent-decorative)">
      <div style="font-family:var(--font-display);font-weight:700;font-size:104px;line-height:1;color:var(--color-text);letter-spacing:-0.02em">
        Underplot Society</div>
      <div style="font-family:var(--font-text);font-size:44px;color:var(--color-accent)">Beneath the Surface.</div>
    </div>`;
});
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
