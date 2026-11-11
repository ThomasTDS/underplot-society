<?php

namespace Tests\Feature\Database;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Throwable;

/**
 * Runs against the real PostgreSQL connection; skipped when it is not reachable.
 */
class StatementTimeoutTest extends TestCase
{
    public function test_a_query_slower_than_the_statement_timeout_is_cancelled(): void
    {
        // phpunit.xml points DB_DATABASE at SQLite for the rest of the suite.
        config([
            'database.connections.pgsql.database' => getenv('DB_TEST_PGSQL_DATABASE') ?: 'underplot',
            'database.connections.pgsql.server_options.statement_timeout' => 200,
        ]);
        DB::purge('pgsql');

        try {
            DB::connection('pgsql')->getPdo();
        } catch (Throwable) {
            $this->markTestSkipped('PostgreSQL is not reachable.');
        }

        $start = microtime(true);

        try {
            DB::connection('pgsql')->select('select pg_sleep(2)');
            $this->fail('The query was not cancelled by statement_timeout.');
        } catch (QueryException $e) {
            // 57014: query_canceled.
            $this->assertSame('57014', $e->getCode());
        }

        $this->assertLessThan(1.5, microtime(true) - $start);
    }
}
