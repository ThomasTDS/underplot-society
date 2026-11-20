# Accessibility

The site targets **WCAG 2.2 level AA**. This page records what is checked, how, and what is left to people.

## Checked automatically

On every main page (home, article list, filtered list, article, not found, About, Privacy, Accessibility), in English, Portuguese and Spanish ([`e2e/tests/ui/accessibility.spec.ts`](../e2e/tests/ui/accessibility.spec.ts)):

| Criterion | Check |
|---|---|
| 1.3.1 Info and relationships | One `h1` per page, and no heading level is skipped. The article body is included: a text whose first heading is `# ...` is moved down a level, so the title stays the only `h1` |
| 1.4.10 Reflow | No sideways scrolling at 320 px wide, the equivalent of 400% zoom at 1280 px |
| 1.4.12 Text spacing | With the WCAG overrides for line height, letter, word and paragraph spacing applied, there is no sideways scrolling and no text is cut off |
| 2.5.8 Target size (minimum) | Every control outside running text (a paragraph or a sentence in a list) is at least 24 × 24 px |
| 3.1.2 Language of parts | The English motto is marked `lang="en"` on Portuguese and Spanish pages. Language names in the switcher carry their own `lang` |
| 2.4.7 Focus visible | Every Tab stop on the home page shows an outline of at least 2 px |
| 2.3.3 Animation from interactions | With reduced motion requested, nothing animates or transitions |

### axe

[`e2e/tests/ui/axe.spec.ts`](../e2e/tests/ui/axe.spec.ts) runs axe (WCAG 2.0, 2.1 and 2.2 A and AA rules, plus best practices) in a real browser on:
- every main page in all three languages, plus the language fallback notice and the page-not-found screen;
- both themes;
- phone and desktop widths.

It runs on every PR:
- A **serious or critical** violation fails the test.
- Minor and moderate ones are attached to the report and listed as annotations, to fix without blocking a merge.
- Text whose contrast axe could not work out also fails, so contrast is never passed unchecked.

Elsewhere:

| Criterion | Where |
|---|---|
| 1.4.3 and 1.4.11 Contrast | [`frontend/src/styles/tokens.test.ts`](../frontend/src/styles/tokens.test.ts), for every text and component pairing in both themes |
| 2.1.1 Keyboard, 2.4.1 Bypass blocks, 2.4.3 Focus order | [`e2e/tests/ui/layout.spec.ts`](../e2e/tests/ui/layout.spec.ts): the exact Tab order, and the skip link moving focus to the content |
| 3.1.1 Language of page | `lang` on `<html>` for each language ([`e2e/tests/ui/locale-detection.spec.ts`](../e2e/tests/ui/locale-detection.spec.ts), [`seo.spec.ts`](../e2e/tests/ui/seo.spec.ts)) |
| 2.4.2 Page titled | A distinct title for each page and language ([`seo.spec.ts`](../e2e/tests/ui/seo.spec.ts)) |
| 4.1.2 Name, role, value | Components are tested with axe in unit tests. Theme and language controls use native radio buttons and links |

## How the site meets the rest

- **Structure:** landmarks (`header`, `main`, `footer`), and each navigation labelled (main, language, area filter, pages). Lists are lists, and articles are `<article>`.
- **Links:** always underlined in text. Navigation marks the current page with `aria-current`.
- **Status messages:** "unavailable" and the language fallback notice use `role="status"`.
- **Errors:** when a page fails, focus moves to the error message, so keyboard and screen reader users land on it.
- **Colour is never the only signal:** the API status is written in text, and the selected filter and theme are shown by colour and by `aria-current` or `checked`.
- **No timing, no autoplay, no motion.**

## Left to people

- **Screen reader pass:** NVDA and VoiceOver, by hand, in all three languages.
- **Content:**
  - Images need meaningful alternative text in each language; the panel requires it.
  - Headings in an article should follow each other in order.
  - Raw HTML in articles is escaped for safety, so a foreign word inside an article cannot be marked with its own `lang` yet.
