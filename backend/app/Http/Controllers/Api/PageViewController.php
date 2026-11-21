<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\ResolveClientIp;
use App\Models\PageView;
use Dedoc\Scramble\Attributes\ExcludeRouteFromDocs;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Counts a page view, sent by the site's own server after it serves a page (see the
 * frontend's src/lib/page-views.ts). Not part of the public API:
 *
 * - it needs the secret the site and the API share (REVALIDATE_SECRET);
 * - it refuses anything that came through Cloudflare, so it is reachable only from
 *   the site's server, on the internal network.
 *
 * Anything else gets a 404, as if the route did not exist. It is left out of the
 * OpenAPI document (ExcludeRouteFromDocs is read only by Scramble, a development
 * dependency; PHP does not load attribute classes unless something reads them).
 */
class PageViewController extends Controller
{
    #[ExcludeRouteFromDocs]
    public function store(Request $request): Response
    {
        abort_unless($this->fromTheSite($request), 404);

        $path = $request->input('path');
        if (! is_string($path) || ! PageView::isCountable($path)) {
            return response()->noContent(422);
        }

        PageView::record($path);

        return response()->noContent();
    }

    private function fromTheSite(Request $request): bool
    {
        $secret = (string) config('services.site.revalidate_secret');
        if (strlen($secret) < 32 || ! hash_equals($secret, (string) $request->bearerToken())) {
            return false;
        }

        // With the proxy header configured, a request without it came from inside.
        return config('api.client_ip_header') === null || ResolveClientIp::isInternal($request);
    }
}
