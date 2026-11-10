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
npm run typecheck   # TypeScript
npm run build       # production build
```
