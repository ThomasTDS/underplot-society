# Frontend

Public site, built with Next.js (App Router) and TypeScript.

## Requirements

- Node.js 24.15 or later (developed on Node 26 LTS)
- The backend API running locally (see [`../backend/README.md`](../backend/README.md))

## Local setup

From this directory:

```sh
npm install
cp .env.example .env.local
npm run dev
```

`API_BASE_URL` points to the backend API. It is read on the server only and never sent to the browser.

## Languages

Every page lives under a locale prefix: `/en`, `/pt-br` or `/es` (`src/app/[lang]/`).

A request without a locale prefix (for example `/` or `/about`) is redirected by `src/proxy.ts`:

1. to the locale in the `locale` cookie, if it holds a valid one (the reader's manual choice);
2. otherwise to the best match for the browser's `Accept-Language`, in the reader's order of preference: any Portuguese variant goes to `pt-br`, any Spanish variant to `es`, English to `en`;
3. otherwise to `en`.

Playwright checks this against the running site with a matrix of `Accept-Language` values, with and without the cookie (`e2e/tests/ui/locale-detection.spec.ts`).

These redirects are temporary (`307`) and sent with `Vary: Accept-Language, Cookie`. A locale in the wrong case, such as `/PT-BR`, gets a permanent redirect (`308`) to the lower-case form.

Texts live in `src/i18n/messages/{en,pt-br,es}.json`. English is the reference: a test fails if another language is missing a key or has an empty text.

A URL that matches no page gets a `404` with the message in all three languages, each marked with its own `lang`, since the reader's locale is not known there.

## Errors

- **Inside a page** (`src/app/[lang]/error.tsx`): the message replaces the content, in the URL's language, with the header and footer still usable. Focus moves to the message, and "Try again" fetches the page anew. Nothing about the error is shown to the reader.
- **When the layout itself fails** (`src/app/global-error.tsx`): a stand-alone page in all three languages, like the `404`.

Both stand-alone pages use the site's design tokens (`src/app/standalone-page.module.css`).

## API status on the home page

The home page checks `GET /api/health` on every request and shows the result in text:

| API response | Shown as |
|---|---|
| `200` with `{"status": "ok"}` | Operational |
| `503` with `{"status": "error"}` | Degraded: the database is unavailable |
| Anything else, no answer within 5 seconds, or `API_BASE_URL` missing or invalid | Unreachable |

The rest of the page is prerendered; only the status is rendered at request time.

## Design tokens

Colors, type, spacing and shape are CSS variables in [`src/styles/tokens.css`](src/styles/tokens.css). Components use the variables only. A test fails on any literal color (`#…`, `rgb()`, `hsl()`) in another stylesheet.

| Theme | Notes |
|---|---|
| Dark | The brand's own look: Obsidian background, Ivory text, gold accents |
| Light | Ivory background, Obsidian text, Royal Purple links |

### Theme switching

The footer offers three modes: **Automatic** (the default), **Light** and **Dark** ([`src/theme/`](src/theme/)).

| Mode | How it works |
|---|---|
| Automatic | Nothing is stored. CSS follows the system through `prefers-color-scheme`, and changes live when the system does. |
| Light or Dark | Saved in `localStorage` (`theme`) and set as `data-theme` on `<html>`, which wins over the system. Applies to every page and language, and to other open tabs. |

A small inline script in `<head>` applies a saved theme before the body is parsed, so the page never flashes the wrong theme, even before the app's JavaScript loads. If storage is blocked, the site follows the system. The light values appear twice in `tokens.css` (saved choice and light system); a test fails if the two copies differ.

The control is a group of native radio buttons, so arrow keys move between modes and screen readers announce the group.

The palette starts from the brand colors and adjusts them where they fall short of WCAG AA:
- Royal Purple on Obsidian is 1.97:1, so the dark theme uses a lighter purple for links and focus, and a mid purple for buttons.
- Ancient Gold on Ivory is 2.04:1, so the light theme uses a darker gold for text.
- Links are always underlined, because their color is close to the body text.

[`tokens.test.ts`](src/styles/tokens.test.ts) reads `tokens.css` and checks every pairing in both themes:

| Pairing | Minimum ratio |
|---|---|
| Text, secondary text, links, accent and status colors on the background and on both surfaces | 4.5:1 |
| Button text on the button | 4.5:1 |
| Borders, the focus indicator, and the button against the page | 3:1 |

A color change that breaks one of these pairings fails CI.

Fonts are Space Grotesk (headings) and Inter (text), served from the site itself through `next/font/local` from the Fontsource packages (OFL-1.1). No request goes to Google or any other host. The Latin subset covers English, Portuguese and Spanish.

## Base layout

Every page under `[lang]` shares the layout in `src/app/[lang]/layout.tsx` ([`src/components/layout/`](src/components/layout/)):

- **Skip link:** the first Tab stop. It is off screen until focused, then moves focus to `<main id="content">`.
- **Header:** the provisional wordmark (links to the home page), the main navigation and the language switcher. The navigation lists only pages that exist, and marks the current one with `aria-current="page"`.
- **Language switcher:** plain links to the same page in each language, so it works without JavaScript. Each name is in its own language and has its own `lang`. A click also sets the `locale` cookie, so `/` opens in that language next time.
- **Footer:** the theme switcher.

The header and footer wrap instead of collapsing into a menu, so every control stays visible on a phone. Playwright checks the layout at phone and desktop widths in every language, the absence of sideways scrolling, and the Tab order.

## Articles

| Page | Address | Notes |
|---|---|---|
| Home | `/{lang}` | The 3 latest articles |
| List | `/{lang}/articles` | Area filter (`?area=`) and pages (`?page=`), both plain links |
| Article | `/{lang}/articles/{slug}` | The language switcher goes to the article's own slug in each language. A language the article is not published in goes to that language's list, which says why (`?unavailable=article`) |

Content comes from the API at request time ([`src/lib/content-api.ts`](src/lib/content-api.ts), server only). Every response is checked against the expected shape; anything else shows "unavailable" instead of the content. A cover image only gets an `http(s)` address.

**HTML safety.** Titles, summaries and area names are always rendered as text. The article body is the only HTML on the site, and it arrives sanitized from the API (`body_html`). There, CommonMark first escapes raw HTML and drops unsafe links, then an allow-list sanitizer removes anything outside safe elements and attributes. A Playwright test opens an article full of script attempts in all three languages and checks that none runs.

## Rendering and cache

Each page's shell (header, footer, headings, placeholders) is prerendered at build time. The content streams into it at request time from a cache in the site's server ([`src/lib/content.ts`](src/lib/content.ts)), so most visits never reach the API.

| | |
|---|---|
| Tags | Every cached answer is tagged: `content`, `articles:{locale}` (lists), `areas:{locale}` (filter), `article:{locale}:{slug}` (one article, found or not) |
| On a change | The backend calls `POST /internal/revalidate` with the affected tags, and the next visit reads fresh data. Publishing, editing or unpublishing shows at once, with no deploy |
| On its own | Entries refresh after 5 minutes (that is what makes scheduled articles appear) and are never served if older than an hour |
| API down | A failed call is never cached: pages already cached keep showing, others say "unavailable" and try again on the next visit |

`/internal/revalidate` needs `Authorization: Bearer $REVALIDATE_SECRET` (at least 32 characters; without it the endpoint is off). It refuses anything that came through Cloudflare (`CF-Connecting-IP`), and it accepts only the tag shapes above. The proxy skips `/internal/*`.

**Real 404 for unknown articles.** A page cannot change its status once it streams, so the proxy decides first. It asks `/internal/article-exists`, on the server itself and through the same tagged cache. For a missing article it serves the translated not-found page (`/{lang}/missing`) with status `404`. If the check cannot tell (timeout, API down), the page renders as usual. Client-side navigations are left to the page, which shows the same message in place.

## SEO

Two environment variables, read at request time (the same image runs on staging and in production):

| Variable | Meaning |
|---|---|
| `SITE_URL` | The public origin, e.g. `https://underplotsociety.com.br`. Canonical, hreflang, sitemap and share links are absolute and built from it. |
| `SITE_INDEXING` | `on` in production only. Anything else, or a missing `SITE_URL`, keeps the site out of search engines. |

| What | Indexable (production) | Not indexable (staging) |
|---|---|---|
| `robots.txt` | Allows everything except the fallback notice, and lists `/sitemap/{en,pt-br,es}.xml` | `Disallow: /` |
| Pages | `index, follow` | `noindex, nofollow`, and an `X-Robots-Tag` header from the proxy |

Every page gets a title, a description, `canonical`, `hreflang` for each language it exists in plus `x-default`, and Open Graph and Twitter card tags. Articles use their SEO title and description from the panel. Each language links to the article's slug in that language, and the cover is the share image. The other pages share `public/og-default.png`, rendered with the site's fonts by `e2e/scripts/og-image.mjs`. A filtered or later page of the list is its own canonical page without hreflang, because area slugs differ per language. The fallback notice points back to the plain list.

Browsers get the metadata streamed. Crawlers get it in `<head>` before the page: Next's list of such bots plus Googlebot (`htmlLimitedBots` in `next.config.ts`), since Google ignores a canonical in `<body>`. Playwright checks this for Googlebot, Bingbot and a link preview.

The local stack runs as production (`SITE_INDEXING=on`), so the end-to-end tests check the real tags. Unit tests cover the staging mode.

## Newsletter

The newsletter runs on Substack, and the site only links to it: a section on the home page and a link in the footer. There is no form, so the site never sees an email address. An embedded Substack form would load Substack's scripts and cookies on every page.

`NEWSLETTER_URL` (https only) is read at request time. Until it is set, nothing about the newsletter shows. The local stack uses a placeholder.

Playwright checks that a visit loads nothing from any other host, and sets no cookie until the reader picks a language by hand ([`e2e/tests/ui/privacy.spec.ts`](../e2e/tests/ui/privacy.spec.ts)).

## Audience metrics

There are no cookies, no script in the browser and no personal data. Each page includes `PageViewCounter`, a server component that renders nothing. When a person opens the page, by a full load or a click inside the site, it tells the API after the response which page it was. The API keeps only a daily total per page.

- **Prefetches are not counted:** a prefetch fetches only the static part of a page, and the counter is request-time content.
- **Not counted:**
  - **bots and scripts:** recognised by their User-Agent (`src/lib/page-views.ts`), including headless browsers;
  - **missing articles:** the counter sits inside the article, which only renders when it exists;
  - **other paths:** anything outside the site's pages.
- **Off unless configured:** it needs `API_BASE_URL` and `REVALIDATE_SECRET`, the secret the site shares with the API.
- **Why not in the proxy:** Next removes the router headers before the proxy runs, so there a click and a prefetch look the same.

The totals are on the admin panel's dashboard.

## About, Privacy and Accessibility pages

`/{lang}/about`, `/{lang}/privacy` and `/{lang}/accessibility`, the same address in every language. The text lives in code, in `src/content/pages/{en,pt-br,es}.ts`, as plain strings that are never inserted as HTML. A piece can be a link or be marked as another language.

- **Same structure in every language:** a test checks that each language has the same sections, links, date and draft status as English.
- **Draft notice:** a page marked `draft` says so at the top, until its final text is in.
- **Privacy text and code agree:** what the Privacy page promises (no third-party requests, a single optional cookie) is what the privacy end-to-end test checks.

## Quality checks

```sh
npm test            # unit and component tests, including automated accessibility checks (axe)
npm run lint        # ESLint
npm run typecheck   # route types, then TypeScript
npm run build       # production build
```
