<?php

namespace Tests\Feature\Api;

use App\Http\Middleware\PruneExpiredCache;
use App\Providers\AppServiceProvider;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * What the privacy page promises about the rate limit, checked against the real
 * database cache: a visitor's address is never stored in a form that can be turned
 * back into it, and expired counters are deleted soon after.
 */
class RateLimitPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private const IP = '203.0.113.7';

    private const LIST = '/api/v1/en/articles';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'cache.default' => 'database',
            'cache.prune_every' => 300,
            'api.rate_limit' => 60,
            'api.client_ip_header' => 'CF-Connecting-IP',
        ]);
        // The limiter picked its cache store at boot: build it again on the database one.
        $this->app->forgetInstance(RateLimiter::class);
        RateLimiterFacade::clearResolvedInstance(RateLimiter::class);
        AppServiceProvider::defineRateLimits();
    }

    public function test_the_cache_never_holds_the_address_or_a_plain_hash_of_it(): void
    {
        $this->visit()->assertOk();

        $rows = DB::table('cache')->get();
        $this->assertNotEmpty($rows, 'the rate limiter wrote its counter to the database cache');

        // Every form an attacker could reverse by trying all addresses.
        $reversible = [self::IP, md5(self::IP), sha1(self::IP), hash('sha256', self::IP)];
        foreach (['ip:', 'content-api', 'content-apiip:'] as $prefix) {
            $reversible[] = md5($prefix.self::IP);
        }

        foreach ($rows as $row) {
            foreach ($reversible as $form) {
                $this->assertStringNotContainsString($form, $row->key.' '.$row->value);
            }
        }
    }

    public function test_each_visitor_still_has_its_own_limit(): void
    {
        config(['api.rate_limit' => 2]);

        $this->visit()->assertOk();
        $this->visit()->assertOk();
        $this->visit()->assertTooManyRequests();
        $this->visit('203.0.113.8')->assertOk();
    }

    public function test_expired_counters_are_deleted_on_the_next_request_and_live_ones_kept(): void
    {
        $this->visit()->assertOk();
        $counters = $this->counters();
        $this->assertNotEmpty($counters);

        // Six minutes later the counter has expired, but nothing has read it again.
        $this->travel(6)->minutes();
        DB::table('cache')->insert(['key' => 'still-valid', 'value' => 'x', 'expiration' => now()->getTimestamp() + 300]);

        $this->visit('198.51.100.1')->assertOk();

        $this->assertSame([], array_values(array_intersect($counters, $this->keys())));
        $this->assertContains('still-valid', $this->keys());
    }

    public function test_pruning_runs_at_most_once_per_period(): void
    {
        $this->visit()->assertOk();
        $this->travel(2)->minutes();

        // An entry that expired after the last prune, within the same period, waits.
        DB::table('cache')->insert(['key' => 'expired', 'value' => 'x', 'expiration' => now()->getTimestamp() - 1]);
        $this->visit('198.51.100.1');
        $this->assertContains('expired', $this->keys());

        $this->travel(4)->minutes();
        $this->visit('198.51.100.2');
        $this->assertNotContains('expired', $this->keys());
    }

    public function test_the_health_check_never_prunes(): void
    {
        // It must answer fast even with the database down, so it never touches it here.
        DB::table('cache')->insert(['key' => 'old', 'value' => 'x', 'expiration' => now()->getTimestamp() - 60]);

        $this->getJson('/api/health')->assertOk();

        $this->assertSame(['old'], $this->keys());
    }

    public function test_other_cache_stores_are_left_alone(): void
    {
        config(['cache.default' => 'array']);
        DB::table('cache')->insert(['key' => 'old', 'value' => 'x', 'expiration' => now()->getTimestamp() - 60]);

        $this->visit();

        $this->assertContains('old', $this->keys());
        $this->assertSame(1, PruneExpiredCache::prune());
    }

    /** @return TestResponse<Response> */
    private function visit(string $ip = self::IP): TestResponse
    {
        return $this->getJson(self::LIST, ['CF-Connecting-IP' => $ip]);
    }

    /** @return list<string> */
    private function keys(): array
    {
        return array_values(DB::table('cache')->pluck('key')->map(fn ($key) => (string) $key)->all());
    }

    /** @return list<string> */
    private function counters(): array
    {
        return array_values(array_filter($this->keys(), fn ($key) => ! str_contains($key, 'prune-expired-cache')));
    }
}
