# End-to-end tests

Browser tests with [Playwright](https://playwright.dev), run against the full stack.

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

The tests target `http://127.0.0.1:3000` by default; set `E2E_BASE_URL` to test another address.

## Structure

| Path | Contents |
|---|---|
| `tests/` | Test files (`*.spec.ts`). They describe behaviour and never use selectors directly. |
| `pages/` | Page objects: one class per page, holding its locators and actions. |
| `support/` | Shared helpers. `locales.ts` reads the site's own message files, so tests check the real texts in every language. |
| `global-setup.ts` | Runs once before the tests and stops with a clear message if the site is not reachable. |

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

With nothing listening on the base URL, no test runs. The global setup stops with:

```
Error: The site is not reachable at http://127.0.0.1:3000.
Start the stack first, from the repository root: docker compose up --build
Or point the tests elsewhere with E2E_BASE_URL.
```
