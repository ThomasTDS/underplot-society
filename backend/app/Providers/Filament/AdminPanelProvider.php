<?php

namespace App\Providers\Filament;

use App\Filament\Auth\Login;
use App\Http\Middleware\PruneExpiredCache;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

/**
 * The authoring panel at /admin. Login only: no sign-up, no password reset by email.
 */
class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        $panel = $panel
            ->default()
            ->id('admin')
            ->path('admin')
            // Login only (no sign-up, no password reset by email), with a lock per
            // account on top of Filament's limit per address.
            ->login(Login::class)
            // Two-factor authentication with an authenticator app is required: after
            // the password, an account without it must set it up before going further.
            ->multiFactorAuthentication(
                [
                    AppAuthentication::make()
                        ->brandName('Underplot Society')
                        ->recoverable(),
                ],
                isRequired: true,
            )
            // Change the password and manage two-factor authentication.
            ->profile(isSimple: false)
            // Moving between pages swaps the content instead of reloading the whole
            // page, which is what makes the panel feel slow on a small server.
            ->spa()
            ->brandName('Underplot Society')
            ->colors([
                // Royal Purple, from the brand identity.
                'primary' => Color::hex('#5426A5'),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->pages([
                Dashboard::class,
            ])
            ->widgets([])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
                // Login attempts are throttled per address in the cache: delete expired ones.
                PruneExpiredCache::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);

        $domain = config('admin.domain');

        return is_string($domain) ? $panel->domain($domain) : $panel;
    }
}
