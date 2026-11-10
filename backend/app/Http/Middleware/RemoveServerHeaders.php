<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Strip headers that advertise the server software or PHP version.
 */
class RemoveServerHeaders
{
    private const HEADERS = ['X-Powered-By', 'Server'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $header) {
            $response->headers->remove($header);

            // PHP adds X-Powered-By on its own, outside the response object.
            if (! headers_sent()) {
                header_remove($header);
            }
        }

        return $response;
    }
}
