<?php

use App\Http\Middleware\RemoveServerHeaders;
use App\Http\Middleware\ResolveClientIp;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // First, so everything after it (rate limits, logs) sees the visitor's address.
        $middleware->prepend(ResolveClientIp::class);
        $middleware->append(RemoveServerHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Anything under /api answers in JSON, whatever the Accept header or the
        // casing of the path (/API/health is a 404, but still a JSON one).
        $isApi = fn (Request $request) => Str::lower($request->path()) === 'api'
            || Str::startsWith(Str::lower($request->path()), 'api/');

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $isApi($request) || $request->expectsJson(),
        );

        // HTTP errors on the API use the standard status text only, so the
        // requested path or method is never echoed back to the client.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            $status = $e->getStatusCode();

            return response()->json(
                ['message' => SymfonyResponse::$statusTexts[$status] ?? 'Error'],
                $status,
                $e->getHeaders(),
            );
        });
    })->create();
