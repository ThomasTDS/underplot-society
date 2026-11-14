<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Behind Cloudflare, every visitor reaches the app from the tunnel's address, so the
 * visitor's own address has to come from the header the proxy sets. With that
 * header configured (api.client_ip_header), $request->ip() returns the visitor's
 * address, and requests without the header are marked as internal (the frontend).
 */
class ResolveClientIp
{
    public const INTERNAL = 'internal_request';

    public function handle(Request $request, Closure $next): Response
    {
        $header = config('api.client_ip_header');

        if (is_string($header)) {
            $ip = $request->headers->get($header);

            if ($ip === null) {
                $request->attributes->set(self::INTERNAL, true);
            } elseif (filter_var($ip, FILTER_VALIDATE_IP) !== false) {
                $request->server->set('REMOTE_ADDR', $ip);
            }
        }

        return $next($request);
    }

    public static function isInternal(Request $request): bool
    {
        return $request->attributes->get(self::INTERNAL) === true;
    }
}
