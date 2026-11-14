<?php

namespace App\Providers;

use App\Http\Middleware\ResolveClientIp;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Content API: a limit per visitor, and a separate, higher one shared by the
        // site's own server. Over the limit, the answer is a 429 with Retry-After.
        RateLimiter::for('content-api', function (Request $request) {
            if (ResolveClientIp::isInternal($request)) {
                return Limit::perMinute(config()->integer('api.internal_rate_limit'))->by('internal');
            }

            return Limit::perMinute(config()->integer('api.rate_limit'))->by('ip:'.$request->ip());
        });
    }
}
