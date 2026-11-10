<?php

namespace Tests\Feature\Http;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RemoveServerHeadersTest extends TestCase
{
    public function test_it_strips_headers_that_reveal_the_server_software(): void
    {
        Route::get('/_test/leaky-headers', fn () => response('ok')
            ->header('X-Powered-By', 'PHP/'.PHP_VERSION)
            ->header('Server', 'nginx/1.27.0'));

        $this->get('/_test/leaky-headers')
            ->assertOk()
            ->assertHeaderMissing('X-Powered-By')
            ->assertHeaderMissing('Server');
    }
}
