<?php

namespace Tests\Feature\Api;

use Illuminate\Database\Connectors\PostgresConnector;
use Illuminate\Support\Facades\DB;
use PDOException;
use Tests\TestCase;

class HealthCheckConnectAttemptsTest extends TestCase
{
    public function test_a_failing_connection_is_attempted_at_most_twice(): void
    {
        $connector = new class extends PostgresConnector
        {
            public int $attempts = 0;

            /**
             * @param  array<int, mixed>  $options
             */
            protected function createPdoConnection($dsn, $username, #[\SensitiveParameter] $password, $options)
            {
                $this->attempts++;

                // The error seen when the database container is stopped.
                throw new PDOException('SQLSTATE[08006] [7] could not translate host name "db" to address: Name does not resolve');
            }
        };

        $this->app->instance('db.connector.pgsql', $connector);
        config([
            'database.connections.counted' => [
                'driver' => 'pgsql',
                'host' => 'db',
                'database' => 'health_db',
                'username' => 'health_user',
                'password' => 'health-secret',
            ],
            'database.default' => 'counted',
        ]);
        DB::purge('counted');

        $this->getJson('/api/health')->assertStatus(503);

        // Laravel's connector retries once on a lost connection; the query
        // runner must not add another round of attempts on top of that.
        $this->assertLessThanOrEqual(2, $connector->attempts);
    }
}
