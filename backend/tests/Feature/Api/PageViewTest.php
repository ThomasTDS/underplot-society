<?php

namespace Tests\Feature\Api;

use App\Filament\Widgets\PageViewsOverview;
use App\Filament\Widgets\TopPages;
use App\Models\PageView;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class PageViewTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'a-test-secret-that-is-at-least-32-chars-long';

    private const URL = '/api/internal/page-views';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.site.revalidate_secret' => self::SECRET,
            'api.client_ip_header' => 'CF-Connecting-IP',
        ]);
    }

    public function test_the_site_counts_a_view(): void
    {
        $this->send('/pt-br/articles/exemplo')->assertNoContent();
        $this->send('/pt-br/articles/exemplo')->assertNoContent();

        $row = PageView::sole();
        $this->assertSame('/pt-br/articles/exemplo', $row->path);
        $this->assertSame('pt-br', $row->locale);
        $this->assertSame(2, $row->views);
    }

    public function test_each_day_is_its_own_row_on_brazils_calendar(): void
    {
        // 01:00 UTC is still the previous day in São Paulo.
        Carbon::setTestNow('2026-11-21 01:00:00');
        $this->send('/en');
        Carbon::setTestNow('2026-11-21 12:00:00');
        $this->send('/en');

        $this->assertSame(
            ['2026-11-20' => 1, '2026-11-21' => 1],
            DB::table('page_views')->orderBy('day')->pluck('views', 'day')
                ->mapWithKeys(fn ($v, $d) => [substr((string) $d, 0, 10) => (int) $v])->all(),
        );
    }

    public function test_only_what_is_needed_is_stored(): void
    {
        $this->send('/es/about', ['User-Agent' => 'Firefox', 'X-Forwarded-For' => '198.51.100.7']);

        $this->assertSame(['id', 'day', 'path', 'locale', 'views'], array_keys((array) DB::table('page_views')->first()));
    }

    /** @return iterable<string, array{string}> */
    public static function countablePaths(): iterable
    {
        foreach (['/en', '/pt-br/articles', '/es/articles/un-articulo-2', '/en/about', '/pt-br/privacy', '/es/accessibility'] as $path) {
            yield $path => [$path];
        }
    }

    #[DataProvider('countablePaths')]
    public function test_every_page_of_the_site_is_counted(string $path): void
    {
        $this->send($path)->assertNoContent();
        $this->assertSame(1, PageView::count());
    }

    /** @return iterable<string, array{mixed}> */
    public static function refusedPaths(): iterable
    {
        yield 'unknown language' => ['/fr'];
        yield 'unknown page' => ['/en/admin'];
        yield 'query string' => ['/en/articles?area=x'];
        yield 'trailing slash' => ['/en/'];
        yield 'uppercase slug' => ['/en/articles/Abc'];
        yield 'deeper path' => ['/en/articles/a/b'];
        yield 'no leading slash' => ['en'];
        yield 'not a string' => [['/en']];
        yield 'missing' => [null];
        yield 'too long' => ['/en/articles/'.str_repeat('a', 200)];
    }

    #[DataProvider('refusedPaths')]
    public function test_anything_else_is_refused(mixed $path): void
    {
        $this->withToken(self::SECRET)->postJson(self::URL, ['path' => $path])->assertStatus(422);
        $this->assertSame(0, PageView::count());
    }

    public function test_a_wrong_or_missing_secret_is_a_404(): void
    {
        $this->postJson(self::URL, ['path' => '/en'])->assertNotFound();
        $this->withToken('wrong')->postJson(self::URL, ['path' => '/en'])->assertNotFound();
        $this->assertSame(0, PageView::count());
    }

    public function test_requests_through_cloudflare_are_refused_even_with_the_secret(): void
    {
        $this->send('/en', ['CF-Connecting-IP' => '203.0.113.9'])->assertNotFound();
        $this->assertSame(0, PageView::count());
    }

    public function test_it_is_off_without_a_strong_secret(): void
    {
        config(['services.site.revalidate_secret' => 'short']);
        $this->withToken('short')->postJson(self::URL, ['path' => '/en'])->assertNotFound();
    }

    public function test_it_is_not_in_the_public_api_documentation(): void
    {
        $spec = (string) file_get_contents(base_path('openapi.json'));
        $this->assertStringNotContainsString('page-views', $spec);
    }

    public function test_the_dashboard_lists_the_most_viewed_pages_of_the_last_30_days(): void
    {
        Carbon::setTestNow('2026-11-20 12:00:00');
        DB::table('page_views')->insert([
            ['day' => '2026-11-20', 'path' => '/en', 'locale' => 'en', 'views' => 5],
            ['day' => '2026-11-19', 'path' => '/en', 'locale' => 'en', 'views' => 3],
            ['day' => '2026-11-18', 'path' => '/es/about', 'locale' => 'es', 'views' => 9],
            ['day' => '2026-10-01', 'path' => '/pt-br', 'locale' => 'pt-br', 'views' => 100],
        ]);

        $this->assertSame(
            [['/es/about', 9], ['/en', 8]],
            array_map(fn ($r) => [$r['path'], $r['views']], array_values(TopPages::rows())),
        );

        $this->actingAs(User::factory()->withTwoFactor()->create())->get('/admin')->assertOk();
        Livewire::test(TopPages::class)->assertSee(['Most viewed pages, last 30 days', '/es/about', '9']);
        // Today 5, last 7 days 5 + 3 + 9, last 30 days the same (the October day is older).
        Livewire::test(PageViewsOverview::class)->assertSeeInOrder(['Today', '5', 'Last 7 days', '17', 'Last 30 days', '17']);
    }

    /**
     * @param  array<string, string>  $headers
     * @return TestResponse<Response>
     */
    private function send(string $path, array $headers = []): TestResponse
    {
        return $this->withToken(self::SECRET)->postJson(self::URL, ['path' => $path], $headers);
    }
}
