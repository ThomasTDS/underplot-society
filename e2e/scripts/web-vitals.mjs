// Measures Core Web Vitals on the main pages of a running site, and fails above the
// "good" thresholds: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1.
//
// Each page opens in a fresh browser (cold cache), as a first visit, in two profiles:
//   - phone:   412x915, slow 4G (150 ms, 1.6 Mbps down, 750 kbps up) and a CPU 4x
//              slower, the throttling Lighthouse uses for mobile;
//   - desktop: 1350x940, no throttling.
//
// LCP and CLS come from the browser's own PerformanceObserver entries (the same
// sources the web-vitals library reads). INP is the slowest real interaction on the
// page: switching the theme and moving through it by keyboard. These are lab numbers;
// field numbers come later, from real visitors.
//
// Before measuring, each page is requested once without a browser, so the server's
// cache is warm, as it is for nearly every visit. The time of that first request is
// printed too: right after a deploy or a long idle spell it shows what the first
// visitor pays.
//
// WEB_VITALS_SELF_TEST=1 plants a late banner that pushes the page down and a click
// handler that blocks for 300 ms: every page must then FAIL on CLS and INP, which
// proves the measurement can catch them.
//
// Run from the e2e directory:
//   node scripts/web-vitals.mjs https://staging.underplotsociety.com.br
import { chromium, devices } from "@playwright/test";

const origin = (process.argv[2] ?? process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const pages = (process.env.WEB_VITALS_PAGES ?? "/pt-br,/en/articles,/es/articles/ejemplo-leyendo-la-letra-pequena,/pt-br/about")
  .split(",");

const GOOD = { lcp: 2500, inp: 200, cls: 0.1 };
const CHROME = devices["Desktop Chrome"].userAgent;

const profiles = [
  {
    name: "phone",
    context: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: CHROME },
    network: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
    cpu: 4,
  },
  { name: "desktop", context: { viewport: { width: 1350, height: 940 }, userAgent: CHROME }, network: null, cpu: 1 },
];

/** Runs in the page before anything else: collects LCP, CLS (session windows) and interactions. */
function observe() {
  const vitals = { lcp: 0, cls: 0, inp: 0 };
  window.__vitals = vitals;

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });

  // CLS: the largest burst of shifts (gaps under 1 s, at most 5 s long), as defined.
  let session = 0;
  let first = 0;
  let last = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      if (session && entry.startTime - last < 1000 && entry.startTime - first < 5000) {
        session += entry.value;
      } else {
        session = entry.value;
        first = entry.startTime;
      }
      last = entry.startTime;
      vitals.cls = Math.max(vitals.cls, session);
    }
  }).observe({ type: "layout-shift", buffered: true });

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId) vitals.inp = Math.max(vitals.inp, entry.duration);
    }
  }).observe({ type: "event", buffered: true, durationThreshold: 16 });
}

/** Self-test only: a layout shift after load, and a slow click handler. */
function sabotage() {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const banner = document.createElement("div");
      banner.style.height = "400px";
      document.body.prepend(banner);
    }, 300);
  });
  document.addEventListener("click", () => {
    const end = performance.now() + 300;
    while (performance.now() < end);
  });
}

async function measure(browser, profile, path) {
  const context = await browser.newContext(profile.context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (profile.network) await cdp.send("Network.emulateNetworkConditions", profile.network);
  if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  await page.addInitScript(observe);
  if (process.env.WEB_VITALS_SELF_TEST) await page.addInitScript(sabotage);

  const response = await page.goto(origin + path, { waitUntil: "load", timeout: 60_000 });
  if (!response?.ok()) throw new Error(`${path}: HTTP ${response?.status()}`);
  await page.waitForLoadState("networkidle");

  // Real interactions for INP: pick each theme, then move by keyboard.
  const themes = page.getByRole("contentinfo").locator("label");
  for (let i = 0; i < (await themes.count()); i++) await themes.nth(i).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);

  const vitals = await page.evaluate(() => window.__vitals);
  await context.close();
  return vitals;
}

for (const path of pages) {
  const start = performance.now();
  const response = await fetch(origin + path, { headers: { "User-Agent": CHROME, Accept: "text/html" } });
  await response.text();
  console.log(`warm-up ${path.padEnd(48)} HTTP ${response.status} in ${Math.round(performance.now() - start)} ms`);
}

const browser = await chromium.launch();
const rows = [];
try {
  for (const profile of profiles) {
    for (const path of pages) {
      const v = await measure(browser, profile, path);
      const ok = v.lcp <= GOOD.lcp && v.inp <= GOOD.inp && v.cls <= GOOD.cls;
      rows.push({ ok, profile: profile.name, path, ...v });
      console.log(
        `${ok ? "ok  " : "FAIL"} ${profile.name.padEnd(7)} ${path.padEnd(48)} ` +
          `LCP ${(v.lcp / 1000).toFixed(2)} s  INP ${Math.round(v.inp)} ms  CLS ${v.cls.toFixed(3)}`,
      );
    }
  }
} finally {
  await browser.close();
}

const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed} of ${rows.length} page loads within LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1`);
process.exit(failed ? 1 : 0);
