<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * openapi.json is generated from the code. This fails when the code changed and the
 * committed document was not regenerated, so every API change shows up in the diff
 * of the pull request.
 */
class OpenApiDocumentTest extends TestCase
{
    // Scramble reads column types from the database, so the tables must exist.
    use RefreshDatabase;

    public function test_the_committed_document_matches_the_code(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'openapi');
        $this->assertNotFalse($path);

        try {
            $this->assertSame(0, Artisan::call('scramble:export', ['--path' => $path]));

            $this->assertSame(
                json_decode((string) file_get_contents(base_path('openapi.json')), true),
                json_decode((string) file_get_contents($path), true),
                'openapi.json is out of date. Run `composer openapi` in backend/ and commit the result.',
            );
        } finally {
            @unlink($path);
        }
    }
}
