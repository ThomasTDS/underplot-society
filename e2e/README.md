# End-to-end tests

Browser and API tests with [Playwright](https://playwright.dev), run against the full stack.

## Running

Start the stack first, at the repository root:

```sh
docker compose up --build
```

Then, from this directory:

```sh
npm install
npx playwright install chromium
npm test
```

The site is expected at `http://127.0.0.1:3000` and the API at `http://127.0.0.1:8000`; set `E2E_BASE_URL` and `E2E_API_URL` to test other addresses.

`npm test` runs two Playwright projects: `api` (HTTP only, no browser) and `chromium` (browser).

### Tests that need the database down

Tests tagged `@db-down` are skipped by `npm test`. Run them with:

```sh
npm run test:db-down
```

The script stops the `db` container, runs only the `@db-down` tests, and starts the database again afterwards, even if the tests fail. It needs the stack started with Docker Compose.

## Structure

| Path | Contents |
|---|---|
| `tests/ui/` | Browser tests (`*.spec.ts`). They describe behaviour and never use selectors directly. |
| `tests/api/` | API tests, using Playwright's request context. |
| `pages/` | Page objects: one class per page, holding its locators and actions. |
| `api/` | API clients: the request-level counterpart of page objects (`HealthApi`). |
| `support/` | Shared helpers. `locales.ts` reads the site's own message files, so tests check the real texts in every language. |
| `scripts/run-db-down.mjs` | Stops and restarts the database around the `@db-down` tests. |
| `global-setup.ts` | Runs once before the tests and stops with a clear message if the site or the API is not reachable. |

Locators prefer what a reader perceives: roles and accessible names (`getByRole('region', { name: 'System status' })`). The API status uses its `data-status` attribute, the machine-readable value behind the visible text.

## Edge cases

### The API is down

With the site up and the backend stopped (`docker compose stop backend`), the home page reports the API as unreachable. The test fails and says why:

```
Error: The home page should report the API as operational.
If it reports 'unreachable', the backend is down: check `docker compose ps` and the backend logs.
If it reports 'degraded', the backend is up but its database is not.

expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('region', { name: 'System status' }).locator('[data-status]')
Expected: "operational"
Received: "unreachable"
```

A screenshot and a trace of the failing run are kept in `test-results/` (open the trace with `npx playwright show-trace`).

### The site is down

With nothing listening on the site or API address, no test runs. The global setup stops with:

```
Error: The site is not reachable at http://127.0.0.1:3000.
Start the stack first, from the repository root: docker compose up --build
Or point the tests elsewhere with E2E_BASE_URL.
```

### A `@db-down` test run with the database up

Running a `@db-down` test directly, without stopping the database, fails instead of passing by accident:

```
Error: Expected 503. Run this test through `npm run test:db-down`, which stops the database first.

Expected: 503
Received: 200
```
