<?php

namespace Tests\Feature\Content;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Every migration can be reversed: rolling all of them back leaves nothing behind,
 * and running them again rebuilds the schema.
 */
class ContentMigrationsTest extends TestCase
{
    use DatabaseMigrations;

    private const TABLES = [
        'users', 'media', 'media_translations', 'areas', 'area_translations', 'articles', 'article_translations',
    ];

    public function test_every_migration_can_be_rolled_back_and_run_again(): void
    {
        $this->assertSchemaComplete();

        $this->assertSame(0, Artisan::call('migrate:reset'));

        foreach (self::TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table), "$table survived the rollback.");
        }

        $this->assertSame(0, Artisan::call('migrate'));

        $this->assertSchemaComplete();
    }

    private function assertSchemaComplete(): void
    {
        foreach (self::TABLES as $table) {
            $this->assertTrue(Schema::hasTable($table), "$table is missing.");
        }

        $this->assertTrue(Schema::hasColumns('users', ['app_authentication_secret', 'app_authentication_recovery_codes']));
    }
}
