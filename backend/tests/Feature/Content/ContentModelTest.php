<?php

namespace Tests\Feature\Content;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Area;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\Media;
use App\Models\MediaTranslation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use ValueError;

class ContentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_article_has_one_translation_per_language(): void
    {
        $article = Article::factory()->create();

        foreach (Locale::cases() as $locale) {
            ArticleTranslation::factory()->for($article)->create(['locale' => $locale]);
        }

        $this->assertSame(
            Locale::values(),
            $article->translations()->orderBy('id')->get()->map(fn (ArticleTranslation $t) => $t->locale->value)->all(),
        );

        $this->expectException(QueryException::class);
        ArticleTranslation::factory()->for($article)->create(['locale' => Locale::En]);
    }

    public function test_an_article_slug_is_unique_within_a_language(): void
    {
        ArticleTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'beneath-the-surface']);

        $this->expectException(QueryException::class);
        ArticleTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'beneath-the-surface']);
    }

    public function test_the_same_article_slug_is_allowed_in_different_languages(): void
    {
        ArticleTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'roguelike']);
        ArticleTranslation::factory()->create(['locale' => Locale::PtBr, 'slug' => 'roguelike']);
        ArticleTranslation::factory()->create(['locale' => Locale::Es, 'slug' => 'roguelike']);

        $this->assertSame(3, ArticleTranslation::where('slug', 'roguelike')->count());
    }

    public function test_an_area_slug_is_unique_within_a_language(): void
    {
        AreaTranslation::factory()->create(['locale' => Locale::Es, 'slug' => 'diseno']);
        AreaTranslation::factory()->create(['locale' => Locale::PtBr, 'slug' => 'diseno']);

        $this->expectException(QueryException::class);
        AreaTranslation::factory()->create(['locale' => Locale::Es, 'slug' => 'diseno']);
    }

    public function test_the_model_rejects_an_unsupported_language(): void
    {
        $this->expectException(ValueError::class);
        new ArticleTranslation(['locale' => 'fr']);
    }

    /**
     * Writes that bypass the models (raw queries, manual fixes) are still refused.
     *
     * @return iterable<string, array{string}>
     */
    public static function translationTables(): iterable
    {
        yield 'article translations' => ['article_translations'];
        yield 'area translations' => ['area_translations'];
        yield 'media translations' => ['media_translations'];
    }

    #[DataProvider('translationTables')]
    public function test_the_database_rejects_an_unsupported_language(string $table): void
    {
        $row = match ($table) {
            'article_translations' => [
                'article_id' => Article::factory()->create()->id,
                'slug' => 'x', 'title' => 'x', 'summary' => 'x', 'body' => 'x',
            ],
            'area_translations' => ['area_id' => Area::factory()->create()->id, 'name' => 'x', 'slug' => 'x'],
            default => ['media_id' => Media::factory()->create()->id, 'alt_text' => 'x'],
        };

        foreach (['fr', 'pt', 'EN', 'pt_BR', ''] as $locale) {
            try {
                // A savepoint, so PostgreSQL can go on after the refused insert.
                DB::transaction(fn () => DB::table($table)->insert($row + ['locale' => $locale]));
                $this->fail("Locale '$locale' was accepted by $table.");
            } catch (QueryException) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(0, DB::table($table)->count());
    }

    public function test_the_database_rejects_an_unknown_publication_status(): void
    {
        $this->expectException(QueryException::class);
        DB::table('article_translations')->insert([
            'article_id' => Article::factory()->create()->id,
            'locale' => 'en', 'slug' => 'x', 'title' => 'x', 'summary' => 'x', 'body' => 'x',
            'status' => 'archived',
        ]);
    }

    public function test_a_new_translation_starts_as_a_draft(): void
    {
        $translation = new ArticleTranslation;

        $this->assertSame(PublicationStatus::Draft, $translation->status);
        $this->assertNull($translation->published_at);
    }

    public function test_an_image_has_one_alternative_text_per_language(): void
    {
        $media = Media::factory()->create();
        MediaTranslation::factory()->for($media)->create(['locale' => Locale::En]);

        $this->expectException(QueryException::class);
        MediaTranslation::factory()->for($media)->create(['locale' => Locale::En]);
    }

    public function test_an_area_with_articles_cannot_be_deleted(): void
    {
        $article = Article::factory()->create();

        $this->expectException(QueryException::class);
        $article->area()->firstOrFail()->delete();
    }

    public function test_deleting_an_article_deletes_its_translations(): void
    {
        $translation = ArticleTranslation::factory()->create();

        $translation->article()->firstOrFail()->delete();

        $this->assertModelMissing($translation);
    }

    public function test_deleting_the_cover_image_keeps_the_article(): void
    {
        $article = Article::factory()->for(Media::factory(), 'cover')->create();

        $article->cover?->delete();

        $this->assertNull($article->refresh()->cover_media_id);
    }
}
