<?php

namespace Tests\Feature\Content;

use App\Enums\Locale;
use App\Models\Area;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Support\SiteCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SiteCacheTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'http://frontend:3000/internal/revalidate';

    private const SECRET = 'test-secret-that-is-long-enough-0123456789';

    /** Status the fake site answers with. */
    private int $siteStatus = 200;

    /** Calls recorded before the action under test. */
    private int $seen = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.site.revalidate_url' => self::URL, 'services.site.revalidate_secret' => self::SECRET]);
        $this->app->forgetInstance(SiteCache::class);
        Http::fake(fn () => Http::response(['revalidated' => []], $this->siteStatus));
    }

    public function test_publishing_an_article_drops_its_pages_and_the_lists_in_one_call(): void
    {
        $article = $this->draftArticle();

        $article->publish();
        $calls = $this->sendAndRecord();

        $this->assertCount(1, $calls, 'three translations saved, one call');
        $this->assertSame('Bearer '.self::SECRET, $calls[0]->header('Authorization')[0]);
        foreach (['article:en:hello', 'article:pt-br:ola', 'article:es:hola', 'articles:en', 'articles:pt-br', 'articles:es', 'areas:es'] as $tag) {
            $this->assertContains($tag, $calls[0]['tags']);
        }
    }

    public function test_changing_a_slug_also_drops_the_old_address(): void
    {
        $article = $this->draftArticle();

        $article->translations()->where('locale', Locale::En)->firstOrFail()->update(['slug' => 'hello-again']);
        $tags = $this->sendAndRecord()[0]['tags'];

        $this->assertContains('article:en:hello', $tags);
        $this->assertContains('article:en:hello-again', $tags);
    }

    public function test_unpublishing_drops_the_article_pages_although_no_model_event_fires(): void
    {
        $article = $this->draftArticle();
        $article->publish();
        $this->sendAndRecord();

        $article->unpublish();
        $tags = $this->sendAndRecord()[0]['tags'];

        $this->assertContains('article:pt-br:ola', $tags);
        $this->assertContains('articles:pt-br', $tags);
    }

    public function test_deleting_an_article_drops_the_pages_of_its_translations(): void
    {
        $article = $this->draftArticle();

        $article->delete();

        $this->assertContains('article:es:hola', $this->sendAndRecord()[0]['tags']);
    }

    public function test_an_area_change_drops_everything(): void
    {
        $area = Area::factory()->create();
        $this->sendAndRecord();

        $area->update(['position' => 9]);

        $this->assertSame([['content']], array_map(fn (Request $r) => $r['tags'], $this->sendAndRecord()));
    }

    public function test_nothing_is_sent_before_the_end_of_the_request(): void
    {
        $this->draftArticle()->publish();

        $this->assertSame([], $this->recordedSince());
    }

    public function test_a_failing_site_is_logged_and_never_breaks_the_change(): void
    {
        $article = $this->draftArticle();
        $this->siteStatus = 500;
        $log = Log::spy();

        $article->publish();
        $this->sendAndRecord();

        $this->assertSame(3, ArticleTranslation::where('status', 'published')->count());
        $log->shouldHaveReceived('warning')->once()->withArgs(fn (string $message) => str_contains($message, 'refused'));
    }

    public function test_it_is_off_without_a_long_enough_secret(): void
    {
        foreach ([null, 'short'] as $i => $secret) {
            config(['services.site.revalidate_secret' => $secret]);
            $this->app->forgetInstance(SiteCache::class);

            $this->draftArticle("{$i}")->publish();

            $this->assertSame([], $this->sendAndRecord());
        }
    }

    /**
     * Sends the pending tags, as the end of a request does, and returns the calls
     * made since the last time.
     *
     * @return list<Request>
     */
    private function sendAndRecord(): array
    {
        $this->app->make(SiteCache::class)->flush();
        $calls = $this->recordedSince();
        $this->seen += count($calls);

        return $calls;
    }

    /**
     * @return list<Request>
     */
    private function recordedSince(): array
    {
        $all = array_values(array_map(fn (array $pair) => $pair[0], Http::recorded()->all()));

        return array_slice($all, $this->seen);
    }

    /** A draft in all three languages; what creating it sent is already counted. */
    private function draftArticle(string $suffix = ''): Article
    {
        $article = Article::factory()->create();
        foreach (['en' => 'hello', 'pt-br' => 'ola', 'es' => 'hola'] as $locale => $slug) {
            ArticleTranslation::factory()->for($article)->create([
                'locale' => $locale,
                'slug' => $slug.($suffix === '' ? '' : "-{$suffix}"),
                'status' => 'draft',
                'published_at' => null,
            ]);
        }
        $this->sendAndRecord();

        return $article;
    }
}
