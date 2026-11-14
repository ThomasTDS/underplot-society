<?php

namespace Tests\Feature\Api;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\ArticleTranslation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class RateLimitAndCacheTest extends TestCase
{
    use RefreshDatabase;

    private const LIST = '/api/v1/en/articles';

    protected function setUp(): void
    {
        parent::setUp();
        config(['api.rate_limit' => 3, 'api.internal_rate_limit' => 5, 'api.client_ip_header' => null]);
    }

    // Rate limiting.

    public function test_a_visitor_over_the_limit_gets_a_429(): void
    {
        $this->hit(3)->assertOk();

        $this->getJson(self::LIST)
            ->assertTooManyRequests()
            ->assertExactJson(['message' => 'Too Many Requests'])
            ->assertHeader('Retry-After')
            ->assertHeader('X-RateLimit-Limit', '3')
            ->assertHeader('X-RateLimit-Remaining', '0');
    }

    public function test_the_limit_resets_after_a_minute(): void
    {
        $this->hit(4)->assertTooManyRequests();

        $this->travel(61)->seconds();

        $this->getJson(self::LIST)->assertOk();
    }

    public function test_single_articles_and_lists_share_the_limit(): void
    {
        $this->hit(3);

        $this->getJson('/api/v1/en/articles/anything')->assertTooManyRequests();
    }

    public function test_each_visitor_has_its_own_limit(): void
    {
        $this->hit(4, ip: '203.0.113.1')->assertTooManyRequests();

        $this->hit(1, ip: '203.0.113.2')->assertOk();
    }

    public function test_the_health_check_is_not_rate_limited(): void
    {
        $this->hit(4)->assertTooManyRequests();

        $this->getJson('/api/health')->assertOk();
    }

    public function test_the_proxy_header_is_ignored_unless_configured(): void
    {
        // Without the setting, a client cannot pick its own address to dodge the limit.
        foreach (range(1, 3) as $n) {
            $this->getJson(self::LIST, ['CF-Connecting-IP' => "198.51.100.$n"])->assertOk();
        }

        $this->getJson(self::LIST, ['CF-Connecting-IP' => '198.51.100.99'])->assertTooManyRequests();
    }

    // Behind Cloudflare (client_ip_header set).

    public function test_behind_the_proxy_each_visitor_is_counted_by_the_header(): void
    {
        config(['api.client_ip_header' => 'CF-Connecting-IP']);

        $this->hit(4, headers: ['CF-Connecting-IP' => '198.51.100.1'])->assertTooManyRequests();

        $this->hit(1, headers: ['CF-Connecting-IP' => '198.51.100.2'])->assertOk();
        $this->hit(1, headers: ['CF-Connecting-IP' => '2001:db8::1'])->assertOk();
    }

    public function test_behind_the_proxy_requests_without_the_header_use_the_internal_limit(): void
    {
        config(['api.client_ip_header' => 'CF-Connecting-IP']);

        // Visitors exhausting their own limit do not affect the site's own server.
        $this->hit(4, headers: ['CF-Connecting-IP' => '198.51.100.1'])->assertTooManyRequests();

        $this->hit(5)->assertOk()->assertHeader('X-RateLimit-Limit', '5');
        $this->getJson(self::LIST)->assertTooManyRequests();
    }

    public function test_behind_the_proxy_an_invalid_header_value_is_not_trusted(): void
    {
        config(['api.client_ip_header' => 'CF-Connecting-IP']);

        // Falls back to the connection's address, and still counts as a visitor.
        foreach (['not-an-ip', '999.1.1.1', "198.51.100.1\r\nX-Injected: 1"] as $value) {
            $this->getJson(self::LIST, ['CF-Connecting-IP' => $value])
                ->assertOk()
                ->assertHeader('X-RateLimit-Limit', '3');
        }

        $this->getJson(self::LIST, ['CF-Connecting-IP' => 'still-not-an-ip'])->assertTooManyRequests();
    }

    // ETag and conditional requests.

    public function test_responses_carry_an_etag_and_must_be_revalidated(): void
    {
        $this->published('hello');

        foreach ([self::LIST, '/api/v1/en/articles/hello'] as $path) {
            $response = $this->getJson($path)->assertOk();

            $this->assertNotEmpty($response->headers->get('ETag'));
            $this->assertStringContainsString('no-cache', (string) $response->headers->get('Cache-Control'));
            $this->assertStringContainsString('public', (string) $response->headers->get('Cache-Control'));
        }
    }

    public function test_an_unchanged_response_is_a_304_without_a_body(): void
    {
        config(['api.rate_limit' => 100]);
        $this->published('hello');

        foreach ([self::LIST, '/api/v1/en/articles/hello'] as $path) {
            $etag = (string) $this->getJson($path)->headers->get('ETag');

            $response = $this->getJson($path, ['If-None-Match' => $etag])->assertStatus(Response::HTTP_NOT_MODIFIED);

            $this->assertSame('', $response->getContent());
            $this->assertSame($etag, $response->headers->get('ETag'));
        }
    }

    public function test_a_change_in_the_content_changes_the_etag(): void
    {
        config(['api.rate_limit' => 100]);
        $this->published('first');
        $etag = (string) $this->getJson(self::LIST)->headers->get('ETag');

        $this->published('second');

        $this->getJson(self::LIST, ['If-None-Match' => $etag])->assertOk()->assertJsonCount(2, 'data');
        $this->assertNotSame($etag, $this->getJson(self::LIST)->headers->get('ETag'));
    }

    public function test_errors_carry_no_etag(): void
    {
        $this->assertNull($this->getJson('/api/v1/en/articles/missing')->assertNotFound()->headers->get('ETag'));
        $this->assertNull($this->getJson(self::LIST.'?page=0')->assertUnprocessable()->headers->get('ETag'));
    }

    /**
     * Makes $times requests and returns the last response.
     *
     * @param  array<string, string>  $headers
     * @return TestResponse<Response>
     */
    private function hit(int $times, string $ip = '127.0.0.1', array $headers = []): TestResponse
    {
        $request = fn () => $this->withServerVariables(['REMOTE_ADDR' => $ip])->getJson(self::LIST, $headers);

        for ($n = 1; $n < $times; $n++) {
            $request();
        }

        return $request();
    }

    private function published(string $slug): void
    {
        ArticleTranslation::factory()->create([
            'slug' => $slug,
            'locale' => Locale::En,
            'status' => PublicationStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }
}
