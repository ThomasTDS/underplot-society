# Backend

Laravel API and admin panel, backed by PostgreSQL.

## Requirements

- PHP 8.4 with the `pdo_pgsql`, `mbstring`, `openssl`, `curl`, `fileinfo`, `intl`, `sodium` and `zip` extensions (`pdo_sqlite` for the test suite)
- Composer 2
- Docker, for the local database

## Local setup

From this directory:

```sh
composer install
cp .env.example .env
php artisan key:generate
```

Set a password in `DB_PASSWORD` inside `.env`, then start the database and run the migrations:

```sh
docker compose up -d --wait
php artisan migrate
php artisan serve
```

The database listens on `127.0.0.1` only.

## Health check

`GET /api/health` reports whether the API can serve requests.

| Situation | Status | Body |
|---|---|---|
| Database reachable | `200` | `{"status": "ok"}` |
| Database unreachable | `503` | `{"status": "error", "error": "database_unavailable"}` |

Failure details are written to the application log only. Responses are sent with `Cache-Control: no-store`.

## Debug mode

Debug mode can only be enabled when `APP_ENV=local`. In any other environment `APP_DEBUG` is ignored, so a misconfigured server cannot expose stack traces or configuration.

## Quality checks

```sh
php artisan test        # test suite
vendor/bin/pint --test  # code style
composer audit          # known vulnerabilities in dependencies
```
