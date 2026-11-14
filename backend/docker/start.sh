#!/bin/sh
# Container entrypoint for the web server. Builds Laravel's and Filament's caches
# (configuration, routes, events, compiled views, panel components and icons) from
# this container's environment, then serves. Doing it here rather than in the image
# keeps secrets out of the image, and the first visit after a deploy does not pay
# for compiling every view.
set -eu

php artisan optimize --quiet

exec php artisan serve --host=0.0.0.0 --port=8000 --no-reload
