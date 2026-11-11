<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    private const ERROR_BODY = ['status' => 'error', 'error' => 'database_unavailable'];

    /** Strings that must never reach a client. */
    private const INTERNAL_DETAILS = ['127.0.0.1', 'health_db', 'health_user', 'health-secret', 'SQLSTATE', 'pgsql', 'PDO', 'Exception', 'vendor'];

    /** @var resource|null */
    private $hungServer = null;

    protected function tearDown(): void
    {
        if (is_resource($this->hungServer)) {
            fclose($this->hungServer);
        }

        parent::tearDown();
    }

    // a) Database reachable.

    public function test_it_reports_ok_when_the_database_is_reachable(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok'])
            ->assertHeader('Content-Type', 'application/json')
            ->assertHeader('Cache-Control', 'no-store, private');
    }

    // b) Database down.

    public function test_it_returns_a_generic_503_when_the_database_is_unreachable(): void
    {
        $this->useUnreachableDatabase(port: 1);
        $log = Log::spy();

        $response = $this->getJson('/api/health')
            ->assertStatus(503)
            ->assertExactJson(self::ERROR_BODY)
            ->assertHeader('Content-Type', 'application/json')
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->assertNoInternalDetails($this->contentOf($response));
        $log->shouldHaveReceived('error')->once();
    }

    // c) Database hung: accepts the TCP connection but never answers.

    public function test_it_returns_503_within_the_connect_timeout_when_the_database_hangs(): void
    {
        // libpq enforces a 2-second minimum for connect_timeout.
        $this->useUnreachableDatabase(port: $this->startHungServer(), connectTimeout: 2);

        $start = microtime(true);
        $response = $this->getJson('/api/health');
        $elapsed = microtime(true) - $start;

        $response->assertStatus(503)->assertExactJson(self::ERROR_BODY);
        // One connect timeout (2 s) plus margin; a second attempt would take about 4 s.
        $this->assertLessThan(3.5, $elapsed, sprintf('Health check took %.2f s.', $elapsed));
    }

    // d) No Accept: application/json header.

    /**
     * @return array<string, array{string, string, int, bool}>
     */
    public static function requestsWithoutJsonAccept(): array
    {
        return [
            'healthy' => ['GET', '/api/health', 200, false],
            'database down' => ['GET', '/api/health', 503, true],
            'wrong method' => ['POST', '/api/health', 405, false],
            'unknown api route' => ['GET', '/api/does-not-exist', 404, false],
        ];
    }

    #[DataProvider('requestsWithoutJsonAccept')]
    public function test_it_answers_json_even_without_a_json_accept_header(string $method, string $uri, int $status, bool $databaseDown): void
    {
        if ($databaseDown) {
            $this->useUnreachableDatabase(port: 1);
        }

        $response = $this->call($method, $uri, server: ['HTTP_ACCEPT' => 'text/html']);

        $response->assertStatus($status)->assertHeader('Content-Type', 'application/json');
        $this->assertJson($this->contentOf($response));
        $this->assertStringNotContainsStringIgnoringCase('<html', $this->contentOf($response));
    }

    // e) Debug off: no exception details in error responses.

    /**
     * @return array<string, array{string, string, int}>
     */
    public static function errorResponses(): array
    {
        return [
            'database down' => ['GET', '/api/health', 503],
            'wrong method' => ['DELETE', '/api/health', 405],
            'unknown api route' => ['GET', '/api/does-not-exist', 404],
        ];
    }

    #[DataProvider('errorResponses')]
    public function test_error_responses_expose_no_debug_details(string $method, string $uri, int $status): void
    {
        config(['app.debug' => false]);
        $this->useUnreachableDatabase(port: 1);

        $response = $this->json($method, $uri)->assertStatus($status);

        foreach (['exception', 'file', 'line', 'trace'] as $key) {
            $response->assertJsonMissingPath($key);
        }
        $this->assertNoInternalDetails($this->contentOf($response));
    }

    public function test_the_503_body_stays_generic_even_if_debug_is_forced_on(): void
    {
        config(['app.debug' => true]);
        $this->useUnreachableDatabase(port: 1);

        $response = $this->getJson('/api/health')->assertStatus(503)->assertExactJson(self::ERROR_BODY);

        $this->assertNoInternalDetails($this->contentOf($response));
    }

    // f) Only GET (and HEAD) are allowed.

    /**
     * @return array<string, array{string}>
     */
    public static function disallowedMethods(): array
    {
        return ['POST' => ['POST'], 'PUT' => ['PUT'], 'PATCH' => ['PATCH'], 'DELETE' => ['DELETE']];
    }

    #[DataProvider('disallowedMethods')]
    public function test_it_rejects_methods_other_than_get(string $method): void
    {
        $this->json($method, '/api/health')
            ->assertStatus(405)
            ->assertHeader('Content-Type', 'application/json');
    }

    // g) The query string is never echoed back.

    public function test_it_does_not_reflect_the_query_string(): void
    {
        $response = $this->getJson('/api/health?probe=%3Cscript%3Ealert(1)%3C%2Fscript%3E&status=hacked')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);

        foreach (['probe', 'script', 'alert', 'hacked'] as $needle) {
            $this->assertStringNotContainsString($needle, $this->contentOf($response));
        }
    }

    public function test_error_responses_do_not_echo_the_requested_path_or_method(): void
    {
        $this->getJson('/api/%3Cscript%3Eprobe')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Not Found']);

        $this->putJson('/api/health')
            ->assertStatus(405)
            ->assertExactJson(['message' => 'Method Not Allowed'])
            ->assertHeader('Allow', 'GET, HEAD');
    }

    // h) No server or PHP version in the headers.

    public function test_it_does_not_advertise_server_software(): void
    {
        $response = $this->getJson('/api/health')
            ->assertHeaderMissing('X-Powered-By')
            ->assertHeaderMissing('Server');

        foreach ($response->headers->all() as $name => $values) {
            foreach ($values as $value) {
                $this->assertStringNotContainsString(PHP_VERSION, (string) $value, "Header {$name} exposes the PHP version.");
                $this->assertStringNotContainsStringIgnoringCase('php/', (string) $value, "Header {$name} exposes PHP.");
            }
        }
    }

    // i) Path variants.

    public function test_a_trailing_slash_behaves_like_the_canonical_path(): void
    {
        $this->getJson('/api/health/')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function differentlyCasedPaths(): array
    {
        return ['upper-case prefix' => ['/API/health'], 'mixed case' => ['/Api/Health'], 'upper-case path' => ['/API/HEALTH']];
    }

    #[DataProvider('differentlyCasedPaths')]
    public function test_paths_are_case_sensitive_and_answer_with_a_json_404(string $uri): void
    {
        $response = $this->call('GET', $uri, server: ['HTTP_ACCEPT' => 'text/html']);

        $response->assertNotFound()->assertHeader('Content-Type', 'application/json');
        $this->assertStringNotContainsStringIgnoringCase('<html', $this->contentOf($response));
    }

    /**
     * Point the default connection at a local port where no database answers.
     */
    private function useUnreachableDatabase(int $port, int $connectTimeout = 1): void
    {
        config([
            'database.connections.unreachable' => [
                'driver' => 'pgsql',
                'host' => '127.0.0.1',
                'port' => $port,
                'database' => 'health_db',
                'username' => 'health_user',
                'password' => 'health-secret',
                'options' => [\PDO::ATTR_TIMEOUT => $connectTimeout],
            ],
            'database.default' => 'unreachable',
        ]);

        DB::purge('unreachable');
    }

    /**
     * Listen on a free local port without ever accepting or answering, like a frozen server.
     */
    private function startHungServer(): int
    {
        $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
        $this->assertIsResource($server, "Could not open a local socket: {$error}");
        $this->hungServer = $server;

        $address = stream_socket_get_name($server, false);
        $this->assertIsString($address);

        return (int) substr($address, strrpos($address, ':') + 1);
    }

    /**
     * @param  TestResponse<Response>  $response
     */
    private function contentOf(TestResponse $response): string
    {
        $content = $response->getContent();
        $this->assertIsString($content);

        return $content;
    }

    private function assertNoInternalDetails(string $body): void
    {
        foreach ([...self::INTERNAL_DETAILS, base_path()] as $detail) {
            $this->assertStringNotContainsStringIgnoringCase($detail, $body);
        }
    }
}
