<?php

use App\Enums\Locale;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('health');

// Public, read-only content. An unknown language or a malformed slug is a 404
// before any query runs.
Route::prefix('v1/{locale}')
    ->whereIn('locale', Locale::values())
    ->name('v1.')
    ->group(function () {
        Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
        Route::get('/articles/{slug}', [ArticleController::class, 'show'])
            ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')
            ->name('articles.show');
    });
