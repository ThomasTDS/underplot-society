<?php

namespace Tests\Feature\Content;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ContentMigrationsTest extends TestCase
{
    use DatabaseMigrations;

    private const TABLES = [
        'media', 'media_translations', 'areas', 'area_translations', 'articles', 'article_translations',
    ];

    public function test_the_content_migrations_can_be_rolled_back_and_run_again(): void
    {
        foreach (self::TABLES as $table) {
            $this->assertTrue(Schema::hasTable($table), "$table was not created.");
        }

        $this->assertSame(0, Artisan::call('migrate:rollback', ['--step' => 3]));

        foreach (self::TABLES as $table) {
            $this->assertFalse(Schema::hasTable($table), "$table survived the rollback.");
        }
        $this->assertTrue(Schema::hasTable('users'), 'The rollback went past the content migrations.');

        $this->assertSame(0, Artisan::call('migrate'));

        foreach (self::TABLES as $table) {
            $this->assertTrue(Schema::hasTable($table), "$table was not recreated.");
        }
    }
}
