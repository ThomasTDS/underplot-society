<?php

namespace Tests\Feature\Admin;

use App\Filament\Auth\Login;
use App\Models\User;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\PendingCommand;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Item 6.2: strong password, required two-factor authentication, lockout after
 * failed attempts, session expiry, no public sign-up.
 */
class AdminAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'correct horse battery staple';

    private AppAuthentication $twoFactor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->twoFactor = AppAuthentication::make();
    }

    // Two-factor authentication.

    public function test_the_password_alone_does_not_sign_in(): void
    {
        $this->userWithTwoFactor();

        $this->login(self::PASSWORD)->assertHasNoFormErrors();

        $this->assertFalse(Filament::auth()->check());
    }

    public function test_a_wrong_code_does_not_sign_in(): void
    {
        $this->userWithTwoFactor();

        $this->login(self::PASSWORD)
            ->set('data.multiFactor.app.code', '000000')
            ->call('authenticate')
            ->assertHasErrors();

        $this->assertFalse(Filament::auth()->check());
    }

    public function test_the_password_and_the_current_code_sign_in(): void
    {
        $user = $this->userWithTwoFactor();

        $this->login(self::PASSWORD)
            ->set('data.multiFactor.app.code', $this->twoFactor->getCurrentCode($user))
            ->call('authenticate')
            ->assertHasNoErrors()
            ->assertRedirect();

        $this->assertTrue(Filament::auth()->check());
    }

    public function test_an_account_without_two_factor_must_set_it_up_before_using_the_panel(): void
    {
        $user = User::factory()->create();

        foreach (['/admin', '/admin/articles', '/admin/areas'] as $path) {
            $this->actingAs($user)
                ->get($path)
                ->assertRedirectContains('/admin/multi-factor-authentication/set-up');
        }
    }

    public function test_an_account_with_two_factor_uses_the_panel(): void
    {
        $this->actingAs($this->userWithTwoFactor())->get('/admin/articles')->assertOk();
    }

    public function test_the_secret_is_stored_encrypted(): void
    {
        $user = $this->userWithTwoFactor();

        $stored = (string) User::query()->toBase()->where('id', $user->id)->value('app_authentication_secret');

        $this->assertNotSame($user->getAppAuthenticationSecret(), $stored);
        $this->assertStringNotContainsString((string) $user->getAppAuthenticationSecret(), $stored);
    }

    // Failed attempts.

    public function test_an_address_is_limited_to_five_attempts_a_minute(): void
    {
        $this->userWithTwoFactor();

        foreach (range(1, 5) as $attempt) {
            $this->login('wrong password')->assertHasFormErrors(['email']);
        }

        // The sixth is refused before the password is even checked: no error on the
        // form, no two-factor step, just the notice.
        $this->login(self::PASSWORD)
            ->assertHasNoFormErrors()
            ->assertNotified()
            ->assertSet('userUndertakingMultiFactorAuthentication', null);
        $this->assertFalse(Filament::auth()->check());
    }

    public function test_an_account_is_locked_after_ten_failures_even_from_different_addresses(): void
    {
        $user = $this->userWithTwoFactor();

        foreach (range(1, Login::MAX_FAILURES) as $attempt) {
            $this->login('wrong password')->assertHasFormErrors(['email']);
            // Wait out the per-address limit, which a botnet would sidestep anyway.
            $this->travel(61)->seconds();
        }

        // Even the right password and code no longer get in.
        $this->login(self::PASSWORD)->assertNotified('Too many failed attempts');
        $this->assertFalse(Filament::auth()->check());

        $this->travel(Login::LOCKOUT_SECONDS)->seconds();

        $this->login(self::PASSWORD)
            ->set('data.multiFactor.app.code', $this->twoFactor->getCurrentCode($user))
            ->call('authenticate')
            ->assertHasNoErrors();
        $this->assertTrue(Filament::auth()->check());
    }

    public function test_wrong_two_factor_codes_count_towards_the_lock(): void
    {
        $this->userWithTwoFactor();

        foreach (range(1, Login::MAX_FAILURES) as $attempt) {
            $this->login(self::PASSWORD)
                ->set('data.multiFactor.app.code', '000000')
                ->call('authenticate');
            $this->travel(61)->seconds();
        }

        $this->login(self::PASSWORD)->assertNotified('Too many failed attempts');
    }

    public function test_the_lock_does_not_reveal_whether_an_account_exists(): void
    {
        foreach (range(1, Login::MAX_FAILURES) as $attempt) {
            $this->login('wrong password', 'nobody@example.com')->assertHasFormErrors(['email']);
            $this->travel(61)->seconds();
        }

        $this->login('wrong password', 'nobody@example.com')->assertNotified('Too many failed attempts');
    }

    public function test_a_successful_sign_in_clears_the_failures(): void
    {
        $user = $this->userWithTwoFactor();

        foreach (range(1, Login::MAX_FAILURES - 1) as $attempt) {
            $this->login('wrong password');
            $this->travel(61)->seconds();
        }

        $this->login(self::PASSWORD)
            ->set('data.multiFactor.app.code', $this->twoFactor->getCurrentCode($user))
            ->call('authenticate')
            ->assertHasNoErrors();

        $this->assertSame(0, RateLimiter::attempts(Login::lockoutKey($user->email)));
    }

    // Sessions and sign-up.

    public function test_there_is_no_remember_me(): void
    {
        Livewire::test(Login::class)->assertFormFieldDoesNotExist('remember');
    }

    public function test_sessions_expire_when_idle_and_when_the_browser_closes(): void
    {
        $this->assertSame(60, config('session.lifetime'));
        $this->assertTrue(config('session.expire_on_close'));
    }

    // Creating the administrator.

    // In a terminal the command asks again after an invalid answer; under test,
    // Laravel stops at the first one instead.

    public function test_admin_create_creates_the_administrator(): void
    {
        $this->createAdmin()
            ->expectsQuestion('Name', 'T.T.Ravenstone')
            ->expectsQuestion('Email address', 'admin@example.com')
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertSuccessful();

        $user = User::sole();
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        $this->assertNull($user->getAppAuthenticationSecret());
    }

    public function test_admin_create_refuses_a_short_password(): void
    {
        $this->createAdmin()
            ->expectsQuestion('Name', 'T.T.Ravenstone')
            ->expectsQuestion('Email address', 'admin@example.com')
            ->expectsQuestion('Password', 'eleven char')
            ->expectsOutputToContain('at least 12 characters')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_admin_create_refuses_an_email_already_in_use(): void
    {
        User::factory()->create(['email' => 'admin@example.com']);

        $this->createAdmin()
            ->expectsQuestion('Name', 'Someone')
            ->expectsQuestion('Email address', 'admin@example.com')
            ->expectsOutputToContain('already been taken')
            ->assertFailed();

        $this->assertSame(1, User::count());
    }

    private function userWithTwoFactor(): User
    {
        $user = User::factory()->create(['email' => 'admin@example.com', 'password' => self::PASSWORD]);
        $user->saveAppAuthenticationSecret($this->twoFactor->generateSecret());

        return $user;
    }

    private function createAdmin(): PendingCommand
    {
        $command = $this->artisan('admin:create');

        if (! $command instanceof PendingCommand) {
            $this->fail('Console output is not being mocked.');
        }

        return $command;
    }

    /**
     * @return Testable<Login>
     */
    private function login(string $password, string $email = 'admin@example.com'): Testable
    {
        return Livewire::test(Login::class)
            ->fillForm(['email' => $email, 'password' => $password])
            ->call('authenticate');
    }
}
