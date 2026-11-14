<?php

use App\Enums\Locale;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('health');

// Public, read-only content. An unknown language or a malformed slug is a 404
// before any query runs. Rate limited per visitor (429 over the limit). Responses
// carry an ETag: a client that sends it back gets a 304 with no body while the
// content is unchanged. no_cache makes clients check every time, so a published or
// edited article shows up at once.
Route::prefix('v1/{locale}')
    ->whereIn('locale', Locale::values())
    ->middleware(['throttle:content-api', 'cache.headers:public;no_cache;etag'])
    ->name('v1.')
    ->group(function () {
        Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
        Route::get('/articles/{slug}', [ArticleController::class, 'show'])
            ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')
            ->name('articles.show');
    });
