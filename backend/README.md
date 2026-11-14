# Backend

Laravel API and admin panel, backed by PostgreSQL.

## Requirements

- PHP 8.4 with the `pdo_pgsql`, `mbstring`, `openssl`, `curl`, `fileinfo`, `intl`, `sodium` and `zip` extensions (`pdo_sqlite` for the test suite)
- Composer 2
- Docker, for the local database

To run the whole stack in containers instead, see [Running locally](../README.md#running-locally) in the root README.

## Local setup

From this directory:

```sh
composer install
cp .env.example .env
php artisan key:generate
```

Start only the database from the stack, at the repository root (it uses the root `.env`):

```sh
docker compose up -d --wait db
```

Then set `DB_PASSWORD` in `backend/.env` to the same value as in the root `.env`, and run:

```sh
php artisan migrate
php artisan serve
```

The database listens on `127.0.0.1` only.

## Health check

`GET /api/health` reports whether the API can serve requests.

| Situation | Status | Body |
|---|---|---|
| Database reachable | `200` | `{"status": "ok"}` |
| Database unreachable or not answering | `503` | `{"status": "error", "error": "database_unavailable"}` |
| Any method other than `GET` or `HEAD` | `405` | `{"message": "Method Not Allowed"}` |

Failure details are written to the application log only. Responses are sent with `Cache-Control: no-store`.

## Articles API

Read-only, public. `{locale}` is `en`, `pt-br` or `es`.

| Request | Returns |
|---|---|
| `GET /api/v1/{locale}/articles` | Articles in that language, newest first: `data` (slug, title, summary, `published_at`, area, cover) and `meta` (`current_page`, `last_page`, `per_page`, `total`) |
| `GET /api/v1/{locale}/articles/{slug}` | One article in `data`: the summary fields plus the Markdown `body`, `seo` (title and description, falling back to the title and summary), `updated_at` and `translations`, the slug in each language it is published in |

Query parameters for the list: `page` (1 to 10000), `per_page` (1 to 50, default 12) and `area` (an area slug in the same language).

Only translations with status `published` and a `published_at` that has arrived are returned; drafts and scheduled translations do not exist as far as the API is concerned. The area name and the cover's alternative text come in the requested language, and a cover without alternative text in that language is returned as `null`.

| Situation | Status |
|---|---|
| Unknown language, malformed slug, or no visible article with that slug in that language | `404` with `{"message": "Not Found"}` |
| Invalid query parameter (out of range, not a number, unknown area) | `422` with `message` and `errors` per field |
| Any method other than `GET` or `HEAD` | `405` |
| Over the rate limit | `429` with `Retry-After` |

### Rate limits and caching

| Variable | Default | Effect |
|---|---|---|
| `API_RATE_LIMIT` | `60` | Requests per minute per visitor to `/api/v1` |
| `API_INTERNAL_RATE_LIMIT` | `600` | Requests per minute shared by the frontend's server, when `CLIENT_IP_HEADER` is set |
| `CLIENT_IP_HEADER` | empty | Header with the visitor's address set by the proxy in front of the app (`CF-Connecting-IP` on staging). Set it only when the app is reachable solely through that proxy and from the frontend: otherwise anyone could send a fake address. Requests without it are counted as the frontend's. |

Every `/api/v1` response sets `X-RateLimit-Limit` and `X-RateLimit-Remaining`. `/api/health` is not limited.

Successful responses carry an `ETag` and a `Cache-Control` with `public` and `no-cache`. Clients check with the server every time, so a newly published article shows up at once. A client that sends the ETag back in `If-None-Match` gets a `304` with no body while nothing has changed.

## OpenAPI document

[`openapi.json`](openapi.json) describes the API. [Scramble](https://scramble.dedoc.co) generates it from the code: routes, validation rules, resources and the database column types. Scramble is a development dependency only; it is not installed in the images.

After changing the API, regenerate the document and commit it with the change:

```sh
composer openapi
```

Three checks keep the document honest:

| Check | Fails when |
|---|---|
| `OpenApiDocumentTest` | The code changed and `openapi.json` was not regenerated |
| `ApiContractTest` | A real response does not match the document (a missing field, a wrong type) |
| `API contract` job in CI ([oasdiff](https://github.com/oasdiff/oasdiff)) | A pull request makes a change that breaks clients compared with the base branch, such as removing a field or adding a required parameter. Adding fields or endpoints is fine. |

A breaking change goes into a new version (`/api/v2`) while `/api/v1` keeps working.

With `APP_ENV=local`, the documentation can also be browsed at `/docs/api`.

## Database timeouts

| Variable | Default | Effect |
|---|---|---|
| `DB_CONNECT_TIMEOUT` | `3` | Seconds to wait for a connection (the PostgreSQL client enforces a minimum of 2) |
| `DB_STATEMENT_TIMEOUT` | `5000` | Milliseconds a single query may run before the server cancels it (`0` disables it) |

Long maintenance commands, such as heavy migrations, can run with `DB_STATEMENT_TIMEOUT=0`.

## Error responses

Everything under `/api` answers in JSON, whatever the `Accept` header. HTTP errors carry only the standard status text (for example `{"message": "Not Found"}`), never the requested path, method or query string. Paths are case-sensitive: `/API/health` is a JSON `404`.

Responses do not include `X-Powered-By` or `Server` headers. The web server in front of the application must also hide its version (for example `server_tokens off` in nginx).

## Debug mode

Debug mode can only be enabled when `APP_ENV=local`. In any other environment `APP_DEBUG` is ignored, so a misconfigured server cannot expose stack traces or configuration. `.env.example` ships with `APP_DEBUG=false`.

## Content model

Every article is written in English, Brazilian Portuguese and Spanish (`App\Enums\Locale`: `en`, `pt-br`, `es`). What the three versions share lives in one table, and each language gets its own row in a `*_translations` table.

| Table | Holds | Rules enforced by the database |
|---|---|---|
| `articles` | Area and cover image | An area with articles cannot be deleted; deleting the cover image only clears it |
| `article_translations` | Slug, title, summary, Markdown body, status (`draft` or `published`), `published_at`, SEO title and description | One per language per article; slug unique within a language; language and status limited to the known values |
| `areas` / `area_translations` | Subjects used to filter articles, with a translated name and slug | One per language per area; slug unique within a language |
| `media` / `media_translations` | Uploaded files and their alternative text | One alternative text per language per file |

A published translation with a future `published_at` is scheduled: the public API hides it until then. Deleting an article deletes its translations.

## Quality checks

```sh
php artisan test        # test suite
vendor/bin/pint --test  # code style
vendor/bin/phpstan analyse  # static analysis (Larastan, level 8)
composer audit          # known vulnerabilities in dependencies
```

In CI, the suite runs twice: on SQLite, and on PostgreSQL, the database the servers use. To run it on PostgreSQL locally, set `DB_CONNECTION=pgsql`, `DB_DATABASE` and the other `DB_*` variables in the environment; they take precedence over `phpunit.xml`. Use a throwaway database, because the tests drop and recreate every table.

The statement timeout test runs against the PostgreSQL database from `.env` and is skipped when it is not reachable. Set `DB_TEST_PGSQL_DATABASE` if the database name is not `underplot`.
