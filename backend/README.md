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
| `GET /api/v1/{locale}/articles/{slug}` | One article in `data`: the summary fields plus the Markdown `body`, the sanitized `body_html`, `seo` (title and description, falling back to the title and summary), `updated_at` and `translations`, the slug in each language it is published in |
| `GET /api/v1/{locale}/areas` | Areas that have at least one visible article in that language, in their set order: `data` (slug, name) |

`body_html` is rendered by `App\Support\Markdown`, the same code as the admin preview, in two independent layers. First, CommonMark escapes raw HTML and drops links with unsafe schemes. Then an allow-list sanitizer (`symfony/html-sanitizer`) keeps only safe elements and attributes and only `http`, `https` and `mailto` links, and adds `rel="noopener noreferrer"` to links. A script tag, event handler, iframe, form or `javascript:` link in an article never reaches the site as markup.

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

**Visitor addresses are not kept:**
- **Never stored as is:** the per-visitor counter is keyed by an HMAC of the address with `APP_KEY`. A plain hash of an IPv4 address can be reversed by trying them all.
- **Deleted after expiring:** the database cache never deletes an entry that nobody reads again, so `App\Http\Middleware\PruneExpiredCache` deletes expired entries after the response. It runs on the content API and the admin panel, at most once per `cache.prune_every` seconds (300), on the first request after that. It never runs on `/api/health`, which must answer fast with the database down.
- **Tested:** `tests/Feature/Api/RateLimitPrivacyTest.php` checks both against the real database cache. The Privacy page relies on them.

Successful responses carry an `ETag` and a `Cache-Control` with `public` and `no-cache`. Clients check with the server every time, so a newly published article shows up at once. A client that sends the ETag back in `If-None-Match` gets a `304` with no body while nothing has changed.

## Security headers

`App\Http\Middleware\SecurityHeaders` sets `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options` and `Cross-Origin-Opener-Policy` on every response. It also sets a Content-Security-Policy that depends on the path:
- **API** (`/api/*`): JSON only, so the policy allows nothing at all (`default-src 'none'`).
- **Admin panel:** only the app's own origin. Filament, Livewire and Alpine need inline code and Alpine's evaluated expressions, so `'unsafe-inline'` and `'unsafe-eval'` are allowed for scripts. Without `'unsafe-eval'` the sign-in form stops working; the browser test checks this.

Filament's font is bundled with it. Naming another font in the panel would load it from `fonts.bunny.net`, which the policy blocks; a test guards against that.

## Page views

`POST /api/internal/page-views` with `{"path": "/pt-br/about"}` adds one to that page's total for the day, on Brazil's calendar, in `page_views`. Only the day, the page, its language and the count are stored.

- **Callers:** only the site's server. The request needs `Authorization: Bearer $REVALIDATE_SECRET`, and with `CLIENT_IP_HEADER` set it must not have come through Cloudflare. Anything else gets a `404`.
- **Pages:** only the site's own pages are accepted (`PageView::PATH`). Anything else gets a `422`.
- **Documentation:** the route is left out of the OpenAPI document.

The dashboard shows totals for today, 7 days and 30 days, and the most viewed pages (`app/Filament/Widgets`).

## Site cache

After any change the public site shows, `App\Support\SiteCache` tells the site which cached pages to drop. It sends `POST $SITE_REVALIDATE_URL` with `Authorization: Bearer $REVALIDATE_SECRET`, the same secret the frontend has.

- An article, or one of its translations, saved, deleted or unpublished: that article's page in every language (also under a slug it just lost), plus every list and area filter.
- An area, an image or their translations: everything (`content`).

Tags collect during a request and go out in one call after the response is sent, so the panel never waits for the site. A failure is logged, not thrown: the site's cache also refreshes on its own within 5 minutes. Without both settings (secret of at least 32 characters) it is off.

## Sample content

For staging and the end-to-end tests: three sample articles in two areas, in all three languages. Every title starts with "Sample", "Exemplo" or "Ejemplo", so they are easy to delete before launch. Running the seeder again adds nothing.

```sh
php artisan db:seed --class=SampleContentSeeder --force
```

`XssProbeSeeder` adds an article made of script attempts, for the end-to-end tests only. Do not run it on staging.

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

## Admin panel

Articles and areas are written in a [Filament](https://filamentphp.com) panel at `/admin`. On staging it answers only on its own host, `staging-admin.underplotsociety.com.br` (`ADMIN_DOMAIN`); elsewhere its routes do not exist. There is no sign-up and no password reset by email. Create the administrator with the command below. It asks for the name, email and password, and refuses passwords shorter than 12 characters (`make:filament-user` would accept any).

```sh
php artisan admin:create
```

### Signing in

| Protection | How |
|---|---|
| Two-factor authentication | Required, with an authenticator app (TOTP). The first sign-in leads to the set-up page, which shows the QR code and the recovery codes; nothing else in the panel opens until it is done. The secret and the recovery codes are stored encrypted with `APP_KEY`. Recovery codes and two-factor settings are under **Profile**. |
| Failed attempts | Filament limits each address to 5 sign-in attempts a minute. On top of that, each account is locked for 15 minutes after 10 failures (wrong password or wrong code), wherever they come from. The lock answers the same way whether or not the account exists. |
| Sessions | Expire after 60 idle minutes and when the browser closes (`SESSION_LIFETIME`, `SESSION_EXPIRE_ON_CLOSE`). There is no "remember me". |
| Password | At least 12 characters, hashed with bcrypt. Changed under **Profile**, which asks for the current password. |

If the authenticator app and the recovery codes are both lost, clear the secret on the server (`app_authentication_secret` and `app_authentication_recovery_codes` set to null in the `users` table); the next sign-in sets it up again.

- **Articles:** the three languages are edited side by side, and each language has its own **Preview**. The preview renders the Markdown with raw HTML escaped and unsafe links (`javascript:`, `data:`) removed.
- **Publishing:** in the list, **Publish** puts all three languages on the site now, or at a chosen date (scheduling). **Unpublish** takes them all back to draft. Each language can also be set to draft or published in the form.
- **Rules:** publication rules live in the models, not in the panel. An article missing a language cannot be published. A translation published without a date gets the current time. Publishing again keeps the original publication date.
- **Areas:** an area that still has articles cannot be deleted.

The panel's CSS, JavaScript and fonts are published to `public/` by `php artisan filament:assets`, which runs after `composer install` and during the image build. They are not committed.

## Images

Images are uploaded under **Images** in the admin panel and chosen as an article's cover. The rules live in `App\Media\MediaLibrary`, so they hold for anything that stores images, not only the panel:

| Rule | Why |
|---|---|
| JPEG, PNG or WebP only, recognised by the file's content (`finfo` and `getimagesize` must agree), never by its name or by the type the browser sends | A script, an HTML page or an SVG renamed `.jpg` is refused. SVG can carry scripts, so it is not accepted at all. |
| At most 5 MB and 16 megapixels, checked before decoding | Decoding a huge image would exhaust the server's memory |
| Decoded and encoded again as WebP, at most 2400 pixels wide | Only the pixels survive. Metadata such as the camera's GPS position, and anything hidden in or appended to the file, are dropped. |
| Stored as `media/<random id>.webp` | The uploaded name is never used in a path |
| Alternative text required in English, Portuguese and Spanish, up to 300 characters | Accessibility; an image without it in a language is not shown in that language |

Files are stored on the `public` disk (`storage/app/public`, served at `/storage`). In Docker that directory is the `media` volume, so images survive deploys. Deleting an image deletes its file, and articles that used it as a cover keep going without one.

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
