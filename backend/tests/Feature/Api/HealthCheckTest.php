<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_it_reports_ok_when_the_database_is_reachable(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertExactJson(['status' => 'ok'])
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_it_returns_503_when_the_database_is_unreachable(): void
    {
        $this->useUnreachableDatabase();
        Log::spy();

        $response = $this->getJson('/api/health');

        $response->assertStatus(503)
            ->assertExactJson(['status' => 'error', 'error' => 'database_unavailable'])
            ->assertHeader('Cache-Control', 'no-store, private');

        Log::shouldHaveReceived('error')->once();
    }

    public function test_the_503_response_exposes_no_internal_details_even_with_debug_on(): void
    {
        config(['app.debug' => true]);
        $this->useUnreachableDatabase();

        $body = $this->getJson('/api/health')->assertStatus(503)->getContent();

        foreach (['127.0.0.1', 'health-secret', 'health_user', 'SQLSTATE', 'pgsql', 'Exception', base_path()] as $leak) {
            $this->assertStringNotContainsStringIgnoringCase($leak, $body);
        }
    }

    public function test_it_rejects_methods_other_than_get(): void
    {
        $this->postJson('/api/health')->assertStatus(405);
    }

    /**
     * Point the default connection at a closed local port, so connecting fails fast.
     */
    private function useUnreachableDatabase(): void
    {
        config([
            'database.connections.unreachable' => [
                'driver' => 'pgsql',
                'host' => '127.0.0.1',
                'port' => 1,
                'database' => 'health_db',
                'username' => 'health_user',
                'password' => 'health-secret',
                'options' => [\PDO::ATTR_TIMEOUT => 1],
            ],
            'database.default' => 'unreachable',
        ]);

        DB::purge('unreachable');
    }
}
