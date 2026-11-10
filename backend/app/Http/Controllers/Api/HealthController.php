<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class HealthController extends Controller
{
    public function __construct(private readonly DatabaseManager $db) {}

    /**
     * Report whether the API can serve requests, including database access.
     *
     * Failure details go to the log only; the response never exposes
     * hosts, paths, credentials or driver messages.
     */
    public function __invoke(): JsonResponse
    {
        try {
            $this->db->connection()->select('select 1');
        } catch (Throwable $e) {
            Log::error('Health check failed: database unavailable.', [
                'exception' => $e,
            ]);

            return $this->respond(['status' => 'error', 'error' => 'database_unavailable'], 503);
        }

        return $this->respond(['status' => 'ok'], 200);
    }

    /**
     * @param  array<string, string>  $body
     */
    private function respond(array $body, int $status): JsonResponse
    {
        return response()
            ->json($body, $status)
            ->header('Cache-Control', 'no-store');
    }
}
