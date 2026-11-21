<?php

namespace Tests\Feature;

use App\Http\Middleware\SecurityHeaders;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    /** @return iterable<string, array{string, string}> */
    public static function responses(): iterable
    {
        yield 'health' => ['/api/health', SecurityHeaders::API_POLICY];
        yield 'content' => ['/api/v1/en/articles', SecurityHeaders::API_POLICY];
        yield 'API 404' => ['/api/nothing-here', SecurityHeaders::API_POLICY];
        yield 'admin login' => ['/admin/login', SecurityHeaders::PANEL_POLICY];
        yield 'admin redirect' => ['/admin', SecurityHeaders::PANEL_POLICY];
    }

    #[DataProvider('responses')]
    public function test_every_response_carries_the_security_headers(string $path, string $policy): void
    {
        $response = $this->get($path);

        $this->assertHeaders($response, $policy);
    }

    public function test_the_admin_panel_carries_them_when_signed_in(): void
    {
        $response = $this->actingAs(User::factory()->withTwoFactor()->create())->get('/admin');

        $response->assertOk();
        $this->assertHeaders($response, SecurityHeaders::PANEL_POLICY);
    }

    public function test_the_admin_panel_loads_nothing_from_another_host(): void
    {
        $html = $this->get('/admin/login')->assertOk()->getContent();

        // No font, script or stylesheet from elsewhere. Filament's own Inter is bundled;
        // naming another font in the panel would load it from fonts.bunny.net, which the
        // policy would block.
        $this->assertDoesNotMatchRegularExpression('#<(link|script)[^>]+(href|src)="https?://(?!localhost)#i', (string) $html);
        $this->assertStringNotContainsString('fonts.bunny.net', (string) $html);
    }

    public function test_the_policies_allow_no_other_host(): void
    {
        foreach ([SecurityHeaders::API_POLICY, SecurityHeaders::PANEL_POLICY] as $policy) {
            $this->assertDoesNotMatchRegularExpression('#https?:|\*|wss?:#', $policy);
            $this->assertStringContainsString("frame-ancestors 'none'", $policy);
        }
        $this->assertStringContainsString("default-src 'none'", SecurityHeaders::API_POLICY);
        $this->assertStringContainsString("object-src 'none'", SecurityHeaders::PANEL_POLICY);
    }

    /** @param TestResponse<Response> $response */
    private function assertHeaders(TestResponse $response, string $policy): void
    {
        $response->assertHeader('Content-Security-Policy', $policy);
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
        $this->assertStringContainsString('camera=()', (string) $response->headers->get('Permissions-Policy'));
    }
}
