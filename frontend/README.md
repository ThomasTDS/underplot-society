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

## Quality checks

```sh
npm test            # unit and component tests, including automated accessibility checks (axe)
npm run lint        # ESLint
npm run typecheck   # route types, then TypeScript
npm run build       # production build
```
