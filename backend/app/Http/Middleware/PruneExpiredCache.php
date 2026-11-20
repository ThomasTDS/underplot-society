<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deletes expired entries from the database cache after the response is sent, at
 * most once every few minutes (cache.prune_every), on the first request after that.
 *
 * The database cache never deletes an entry that is not read again, so without this
 * every rate-limit counter, one per visitor address, would stay in the table for good.
 * The privacy page promises those are deleted soon after they expire.
 */
class PruneExpiredCache
{
    private const MARKER = 'prune-expired-cache';

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (config('cache.default') !== 'database') {
            return;
        }

        // add() only succeeds when the marker is missing or expired: one prune per period.
        if (Cache::add(self::MARKER, true, config()->integer('cache.prune_every'))) {
            self::prune();
        }
    }

    /** Deletes every expired entry; returns how many. */
    public static function prune(): int
    {
        $store = config('cache.stores.database');

        return DB::connection($store['connection'] ?? null)
            ->table($store['table'] ?? 'cache')
            ->where('expiration', '<=', now()->getTimestamp())
            ->delete();
    }
}
