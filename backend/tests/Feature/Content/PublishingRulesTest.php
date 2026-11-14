<?php

namespace Tests\Feature\Content;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Article;
use App\Models\ArticleTranslation;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Publication rules live in the models (Article::publish/unpublish and the saving
 * hook), so they hold for the panel and anything else that writes articles.
 */
class PublishingRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeSecond();
    }

    public function test_publishing_publishes_all_three_languages_now(): void
    {
        $article = $this->article();

        $article->publish();

        foreach ($article->translations()->get() as $translation) {
            $this->assertSame(PublicationStatus::Published, $translation->status);
            $this->assertEquals(now(), $translation->published_at);
        }
    }

    public function test_publishing_with_a_date_schedules_all_three_languages(): void
    {
        $article = $this->article();

        $article->publish(now()->addWeek());

        $this->assertSame(3, $article->translations()->where('published_at', now()->addWeek())->count());
        $this->assertSame(0, ArticleTranslation::query()->visible()->count());
    }

    public function test_publishing_again_keeps_the_original_date(): void
    {
        $article = $this->article();
        $article->publish(now()->subMonth());
        $article->unpublish();

        $article->publish();

        $this->assertSame(3, $article->translations()->where('published_at', now()->subMonth())->count());
    }

    public function test_publishing_now_brings_a_scheduled_date_forward(): void
    {
        $article = $this->article();
        $article->publish(now()->addWeek());

        $article->publish();

        $this->assertSame(3, $article->translations()->where('published_at', now())->count());
    }

    public function test_an_article_missing_a_language_cannot_be_published(): void
    {
        $article = Article::factory()->create();
        ArticleTranslation::factory()->for($article)->create(['locale' => Locale::En]);
        ArticleTranslation::factory()->for($article)->create(['locale' => Locale::Es]);

        try {
            $article->publish();
            $this->fail('An article missing pt-br was published.');
        } catch (DomainException $e) {
            $this->assertSame('Missing translations: pt-br.', $e->getMessage());
        }

        $this->assertSame(0, ArticleTranslation::where('status', PublicationStatus::Published)->count());
    }

    public function test_unpublishing_takes_every_language_off_the_site(): void
    {
        $article = $this->article();
        $article->publish();

        $article->unpublish();

        $this->assertSame(3, $article->translations()->where('status', PublicationStatus::Draft)->count());
        $this->assertSame(0, ArticleTranslation::query()->visible()->count());
    }

    public function test_a_translation_saved_as_published_without_a_date_gets_the_current_time(): void
    {
        $translation = ArticleTranslation::factory()->create(['status' => PublicationStatus::Published, 'published_at' => null]);

        $this->assertEquals(now(), $translation->published_at);
    }

    public function test_a_draft_keeps_an_empty_date(): void
    {
        $translation = ArticleTranslation::factory()->create(['status' => PublicationStatus::Draft, 'published_at' => null]);

        $this->assertNull($translation->published_at);
    }

    private function article(): Article
    {
        $article = Article::factory()->create();

        foreach (Locale::cases() as $locale) {
            ArticleTranslation::factory()->for($article)->create(['locale' => $locale]);
        }

        return $article;
    }
}
