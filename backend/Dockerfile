FROM composer:2.11.2 AS composer

FROM php:8.4.27-cli-alpine3.24

# PostgreSQL driver, intl and zip for the admin panel (Filament), and GD with JPEG
# and WebP to check and convert uploaded images. Build dependencies are removed
# after compiling; only the runtime libraries stay.
RUN apk add --no-cache libpq icu-libs libzip libpng libjpeg-turbo libwebp \
    && apk add --no-cache --virtual .build-deps postgresql-dev icu-dev libzip-dev \
        libpng-dev libjpeg-turbo-dev libwebp-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install pdo_pgsql intl zip gd \
    && apk del .build-deps

# Uploads: images are at most 5 MB (App\Media\MediaLibrary); a little headroom here.
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf 'expose_php = Off\nupload_max_filesize = 6M\npost_max_size = 8M\n' > "$PHP_INI_DIR/conf.d/zz-hardening.ini"

COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies first, so they are cached while only the code changes.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && php artisan filament:assets \
    && rm /usr/bin/composer \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
        storage/app/public/media \
    && php artisan storage:link \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PHP_CLI_SERVER_WORKERS=4

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=6s --start-period=30s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1:8000/api/health") === false ? 1 : 0);'

CMD ["sh", "docker/start.sh"]
