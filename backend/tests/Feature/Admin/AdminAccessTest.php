<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return iterable<string, array{string}>
     */
    public static function panelPages(): iterable
    {
        yield 'dashboard' => ['/admin'];
        yield 'articles' => ['/admin/articles'];
        yield 'new article' => ['/admin/articles/create'];
        yield 'areas' => ['/admin/areas'];
    }

    #[DataProvider('panelPages')]
    public function test_a_visitor_is_sent_to_the_login_page(string $path): void
    {
        $this->get($path)->assertRedirect('/admin/login');
    }

    #[DataProvider('panelPages')]
    public function test_the_administrator_can_open_the_panel(string $path): void
    {
        $this->actingAs(User::factory()->create())->get($path)->assertOk();
    }

    public function test_the_login_page_is_served(): void
    {
        $this->get('/admin/login')->assertOk();
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function absentPages(): iterable
    {
        yield 'sign-up' => ['/admin/register'];
        yield 'password reset request' => ['/admin/password-reset/request'];
        yield 'password reset' => ['/admin/password-reset/reset'];
        yield 'email verification' => ['/admin/email-verification/prompt'];
    }

    #[DataProvider('absentPages')]
    public function test_there_is_no_sign_up_or_password_reset(string $path): void
    {
        $this->get($path)->assertNotFound();
    }
}
