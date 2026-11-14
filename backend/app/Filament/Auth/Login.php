<?php

namespace App\Filament\Auth;

use Filament\Auth\Http\Responses\Contracts\LoginResponse;
use Filament\Auth\Pages\Login as FilamentLogin;
use Filament\Notifications\Notification;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The panel's login, on top of Filament's (which already limits each address to
 * 5 attempts a minute and the two-factor step to its own limit):
 *
 * - each account is locked for 15 minutes after 10 failed attempts (wrong password
 *   or wrong two-factor code), wherever they come from, so spreading a password
 *   guess over many addresses does not help;
 * - there is no "remember me", which would keep a login past the session's expiry.
 */
class Login extends FilamentLogin
{
    public const MAX_FAILURES = 10;

    public const LOCKOUT_SECONDS = 15 * 60;

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            $this->getEmailFormComponent(),
            $this->getPasswordFormComponent(),
        ]);
    }

    public function authenticate(): ?LoginResponse
    {
        $key = self::lockoutKey((string) ($this->data['email'] ?? ''));

        // The same answer whether or not the account exists.
        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILURES)) {
            Notification::make()
                ->danger()
                ->title('Too many failed attempts')
                ->body('Sign-in for this account is locked for a while. Try again later.')
                ->send();

            return null;
        }

        try {
            $response = parent::authenticate();
        } catch (ValidationException $e) {
            RateLimiter::hit($key, self::LOCKOUT_SECONDS);

            throw $e;
        }

        if ($response !== null) {
            RateLimiter::clear($key);
        }

        return $response;
    }

    public static function lockoutKey(string $email): string
    {
        return 'admin-login:'.hash('sha256', Str::lower(trim($email)));
    }
}
