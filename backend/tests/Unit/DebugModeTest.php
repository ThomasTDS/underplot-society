<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DebugModeTest extends TestCase
{
    /** @var array<string, array{string|null, string|null}> */
    private array $original = [];

    protected function tearDown(): void
    {
        foreach ($this->original as $key => [$env, $server]) {
            $this->restore($_ENV, $key, $env);
            $this->restore($_SERVER, $key, $server);
        }

        parent::tearDown();
    }

    /**
     * @return array<string, array{string|null, string|null, bool}>
     */
    public static function environments(): array
    {
        return [
            'local with debug on' => ['local', 'true', true],
            'local with debug off' => ['local', 'false', false],
            'production with debug on' => ['production', 'true', false],
            'staging with debug on' => ['staging', 'true', false],
            'testing with debug on' => ['testing', 'true', false],
            'no environment set, debug on' => [null, 'true', false],
        ];
    }

    #[DataProvider('environments')]
    public function test_debug_mode_is_only_possible_in_the_local_environment(?string $appEnv, ?string $appDebug, bool $expected): void
    {
        $this->setEnv('APP_ENV', $appEnv);
        $this->setEnv('APP_DEBUG', $appDebug);

        $config = require __DIR__.'/../../config/app.php';

        $this->assertSame($expected, $config['debug']);
    }

    private function setEnv(string $key, ?string $value): void
    {
        $this->original[$key] ??= [$_ENV[$key] ?? null, $_SERVER[$key] ?? null];

        $this->restore($_ENV, $key, $value);
        $this->restore($_SERVER, $key, $value);
    }

    /**
     * @param  array<string, mixed>  $target
     */
    private function restore(array &$target, string $key, ?string $value): void
    {
        if ($value === null) {
            unset($target[$key]);
        } else {
            $target[$key] = $value;
        }
    }
}
