FROM composer:2.11.2 AS composer

FROM php:8.4.27-cli-alpine3.24

# PostgreSQL driver. Build dependencies are removed after compiling; only the
# runtime client library stays.
RUN apk add --no-cache libpq \
    && apk add --no-cache --virtual .build-deps postgresql-dev \
    && docker-php-ext-install pdo_pgsql \
    && apk del .build-deps

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && echo "expose_php = Off" > "$PHP_INI_DIR/conf.d/zz-hardening.ini"

COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies first, so they are cached while only the code changes.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && rm /usr/bin/composer \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PHP_CLI_SERVER_WORKERS=4

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=6s --start-period=10s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1:8000/api/health") === false ? 1 : 0);'

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]
