<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers on every response of the API and the admin panel (the public
 * site sets its own, in the frontend's src/security-headers.ts).
 *
 * - The API answers JSON only: its policy allows nothing at all.
 * - The admin panel (Filament, Livewire, Alpine) relies on inline scripts and styles
 *   and on Alpine's evaluated expressions, so its policy restricts where things come
 *   from, framing, plugins, <base> and form targets, not inline code.
 */
class SecurityHeaders
{
    public const API_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    public const PANEL_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        ."style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; "
        ."connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    private const HEADERS = [
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'Cross-Origin-Opener-Policy' => 'same-origin',
        'Permissions-Policy' => 'accelerometer=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), '
            .'gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $name => $value) {
            $response->headers->set($name, $value);
        }

        $path = Str::lower($request->path());
        $isApi = $path === 'api' || Str::startsWith($path, 'api/');
        $response->headers->set('Content-Security-Policy', $isApi ? self::API_POLICY : self::PANEL_POLICY);

        return $response;
    }
}
