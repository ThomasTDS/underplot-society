import { expect, test } from "@playwright/test";
import { API_URL } from "../../playwright.config";

/**
 * Item 11.2: security headers on every kind of response, and a Content-Security-Policy
 * that the site itself never trips (any violation on a page fails the test).
 */

const pages = [
  "/en",
  "/pt-br/articles",
  "/es/articles?area=cultura",
  "/en/articles/sample-reading-the-fine-print",
  "/pt-br/about",
  "/es/privacy",
  "/en/accessibility",
  "/en/articles/no-such-article",
  "/no-such-page",
];

const required = {
  "content-security-policy": /default-src 'self'.*object-src 'none'.*base-uri 'self'.*form-action 'self'.*frame-ancestors 'none'/,
  "referrer-policy": /^strict-origin-when-cross-origin$/,
  "permissions-policy": /camera=\(\).*geolocation=\(\).*microphone=\(\)/,
  "x-content-type-options": /^nosniff$/,
  "x-frame-options": /^DENY$/,
  "cross-origin-opener-policy": /^same-origin$/,
};

for (const path of [...pages, "/", "/robots.txt", "/sitemap/en.xml"]) {
  test(`${path} carries the security headers`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0, headers: { Accept: "text/html" } });
    const headers = response.headers();
    for (const [name, pattern] of Object.entries(required)) {
      expect(headers[name], name).toMatch(pattern);
    }
  });
}

test("the policy allows nothing from other hosts", async ({ request }) => {
  const policy = (await request.get("/en")).headers()["content-security-policy"];
  for (const directive of policy.split(";").map((d) => d.trim())) {
    // Only the site itself, inline code, data:/blob: images, or 'none'.
    expect(directive, directive).not.toMatch(/https?:|\*|wss?:/);
  }
});

for (const path of pages) {
  test(`${path} works under the policy without a single violation`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { cspViolations: string[] }).cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { cspViolations: string[] }).cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
      });
    });
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) consoleErrors.push(m.text());
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Exercise the scripts: theme switch and a client-side navigation (the stand-alone
    // 404 page has neither).
    if (await page.getByRole("contentinfo").count()) {
      await page.getByRole("contentinfo").getByRole("radio").last().check({ force: true });
      await page.getByRole("navigation").first().getByRole("link").nth(1).click();
      await page.waitForLoadState("networkidle");
    }

    expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test("the check above does catch a violation", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(e.violatedDirective);
    });
  });
  await page.goto("/en");
  const blocked = await page.evaluate(() => fetch("https://example.com/").then(() => false, () => true));
  expect(blocked, "a request to another host is blocked").toBe(true);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations))
    .toContain("connect-src");
});

test("the admin panel works under its policy, without a single violation", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });

  const response = await page.goto(`${API_URL}/admin/login`);
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await page.waitForLoadState("networkidle");

  // A failed sign-in goes through Livewire and Alpine: both must run under the policy.
  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByLabel(/password/i).first().fill("not-the-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/credentials do not match|too many/i)).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
});
