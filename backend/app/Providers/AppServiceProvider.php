<?php

namespace App\Providers;

use App\Http\Middleware\ResolveClientIp;
use App\Models\Area;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\Media;
use App\Models\MediaTranslation;
use App\Support\SiteCache;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SiteCache::class, fn () => new SiteCache(
            config('services.site.revalidate_url'),
            config('services.site.revalidate_secret'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Behind Cloudflare the app receives plain HTTP from the tunnel, but visitors use
        // HTTPS: links and asset URLs must say https, or the browser blocks them.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        $this->forgetSiteCacheOnContentChanges();

        // Password policy for the administrator (admin:create and the profile page).
        // Length over composition rules, as current guidance recommends.
        Password::defaults(fn () => Password::min(12)->max(128));

        self::defineRateLimits();
    }

    /**
     * Content API: a limit per visitor, and a separate, higher one shared by the
     * site's own server. Over the limit, the answer is a 429 with Retry-After.
     */
    public static function defineRateLimits(): void
    {
        RateLimiter::for('content-api', function (Request $request) {
            if (ResolveClientIp::isInternal($request)) {
                return Limit::perMinute(config()->integer('api.internal_rate_limit'))->by('internal');
            }

            return Limit::perMinute(config()->integer('api.rate_limit'))->by('ip:'.self::visitorKey($request));
        });
    }

    /**
     * The visitor's address as the rate limiter stores it: keyed with the app's secret,
     * so a counter left in the cache cannot be turned back into an address (a plain
     * hash of an IPv4 address is undone by trying all four billion).
     */
    public static function visitorKey(Request $request): string
    {
        return hash_hmac('sha256', (string) $request->ip(), (string) config('app.key'));
    }

    /**
     * Any change the public site shows drops the affected cached pages there. An
     * article change drops that article and the lists; areas and images, which can
     * appear anywhere, drop everything.
     */
    private function forgetSiteCacheOnContentChanges(): void
    {
        $cache = fn (): SiteCache => $this->app->make(SiteCache::class);

        ArticleTranslation::saved(fn (ArticleTranslation $t) => $cache()->forgetTranslation($t));
        ArticleTranslation::deleted(fn (ArticleTranslation $t) => $cache()->forgetTranslation($t));
        Article::saved(fn (Article $a) => $cache()->forgetArticle($a));
        // Before the delete, while its translations (removed with it) can still be read.
        Article::deleting(fn (Article $a) => $cache()->forgetArticle($a));

        foreach ([Area::class, AreaTranslation::class, Media::class, MediaTranslation::class] as $model) {
            $model::saved(fn () => $cache()->forget(SiteCache::ALL));
            $model::deleted(fn () => $cache()->forget(SiteCache::ALL));
        }
    }
}
