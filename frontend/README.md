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

These redirects are temporary (`307`) and sent with `Vary: Accept-Language, Cookie`. A locale in the wrong case, such as `/PT-BR`, gets a permanent redirect (`308`) to the lower-case form.

Texts live in `src/i18n/messages/{en,pt-br,es}.json`. English is the reference: a test fails if another language is missing a key or has an empty text.

A URL that matches no page gets a `404` with the message in all three languages, each marked with its own `lang`, since the reader's locale is not known there.

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

## Quality checks

```sh
npm test            # unit and component tests, including automated accessibility checks (axe)
npm run lint        # ESLint
npm run typecheck   # route types, then TypeScript
npm run build       # production build
```
