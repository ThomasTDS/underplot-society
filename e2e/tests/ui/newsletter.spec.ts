import { expect, test } from "@playwright/test";
import { locales, messages } from "../../support/locales";

/**
 * Item 10.1: the newsletter is a link to Substack (the local stack sets a placeholder
 * address). The site has no form and never handles an email address.
 */

const SUBSTACK = "https://underplot-example.substack.com/";

for (const locale of locales) {
  test(`the home page and footer link to the newsletter on Substack (${locale})`, async ({ page }) => {
    const text = messages[locale].newsletter;
    await page.goto(`/${locale}`);

    const section = page.getByRole("region", { name: text.heading });
    await expect(section).toContainText(text.text);
    await expect(section.getByRole("link", { name: text.cta })).toHaveAttribute("href", SUBSTACK);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: text.footer })).toHaveAttribute("href", SUBSTACK);

    // Same tab, no form, nowhere to type an email address.
    await expect(section.getByRole("link", { name: text.cta })).not.toHaveAttribute("target", /.+/);
    await expect(page.locator("form, input[type=email]")).toHaveCount(0);
  });
}

test("the footer link works with the keyboard", async ({ page }) => {
  await page.goto("/en");
  const link = page.getByRole("contentinfo").getByRole("link", { name: messages.en.newsletter.footer });
  await link.focus();
  await expect(link).toBeFocused();
});
