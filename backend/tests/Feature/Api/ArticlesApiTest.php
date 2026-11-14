<?php

namespace Tests\Feature\Api;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Area;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\Media;
use App\Models\MediaTranslation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ArticlesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeSecond();
    }

    // Visibility.

    public function test_the_list_shows_only_published_articles_whose_time_has_come(): void
    {
        $this->translation('published-yesterday', publishedAt: now()->subDay());
        $this->translation('published-now', publishedAt: now());
        $this->translation('scheduled', publishedAt: now()->addMinute());
        $this->translation('draft', status: PublicationStatus::Draft, publishedAt: now()->subDay());
        $this->translation('draft-without-date', status: PublicationStatus::Draft, publishedAt: null);
        // The models fill in the date when publishing; a row written around them
        // (a manual fix in the database) without one still stays hidden.
        DB::table('article_translations')->insert([
            'article_id' => Article::factory()->create()->id,
            'locale' => 'en', 'slug' => 'published-without-date', 'title' => 'x', 'summary' => 'x', 'body' => 'x',
            'status' => 'published', 'published_at' => null,
        ]);

        $this->getJson('/api/v1/en/articles')
            ->assertOk()
            ->assertJsonPath('data.*.slug', ['published-now', 'published-yesterday'])
            ->assertJsonPath('meta.total', 2);
    }

    public function test_the_list_shows_only_the_requested_language(): void
    {
        $article = Article::factory()->create();
        $this->translation('hello', Locale::En, article: $article);
        $this->translation('ola', Locale::PtBr, article: $article);
        $this->translation('hola', Locale::Es, article: $article);

        $this->getJson('/api/v1/pt-br/articles')
            ->assertOk()
            ->assertJsonPath('data.*.slug', ['ola'])
            ->assertJsonPath('data.0.locale', 'pt-br');
    }

    public function test_a_scheduled_article_appears_once_its_time_comes(): void
    {
        $this->translation('later', publishedAt: now()->addHour());

        $this->getJson('/api/v1/en/articles/later')->assertNotFound();

        $this->travel(1)->hours();

        $this->getJson('/api/v1/en/articles/later')->assertOk();
    }

    public function test_a_draft_or_scheduled_article_cannot_be_opened_by_its_slug(): void
    {
        $this->translation('draft', status: PublicationStatus::Draft, publishedAt: now()->subDay());
        $this->translation('scheduled', publishedAt: now()->addDay());

        $this->getJson('/api/v1/en/articles/draft')->assertNotFound()->assertExactJson(['message' => 'Not Found']);
        $this->getJson('/api/v1/en/articles/scheduled')->assertNotFound()->assertExactJson(['message' => 'Not Found']);
    }

    // Single article.

    public function test_an_article_is_returned_with_its_body_and_the_languages_it_is_published_in(): void
    {
        $article = Article::factory()->create();
        $en = $this->translation('beneath-the-surface', Locale::En, article: $article, attributes: [
            'title' => 'Beneath the Surface',
            'summary' => 'Why we write.',
            'body' => "# Hello\n\nMarkdown body.",
        ]);
        $this->translation('sob-a-superficie', Locale::PtBr, article: $article);
        $this->translation('bajo-la-superficie', Locale::Es, article: $article, status: PublicationStatus::Draft);

        $this->getJson('/api/v1/en/articles/beneath-the-surface')
            ->assertOk()
            ->assertJsonPath('data.slug', 'beneath-the-surface')
            ->assertJsonPath('data.locale', 'en')
            ->assertJsonPath('data.title', 'Beneath the Surface')
            ->assertJsonPath('data.body', "# Hello\n\nMarkdown body.")
            ->assertJsonPath('data.published_at', $en->published_at?->toIso8601String())
            ->assertJsonPath('data.seo', ['title' => 'Beneath the Surface', 'description' => 'Why we write.'])
            // The Spanish draft is not offered as a translation.
            ->assertJsonPath('data.translations', ['en' => 'beneath-the-surface', 'pt-br' => 'sob-a-superficie']);
    }

    public function test_seo_fields_are_used_when_set(): void
    {
        $this->translation('seo', attributes: ['seo_title' => 'Custom title', 'seo_description' => 'Custom description']);

        $this->getJson('/api/v1/en/articles/seo')
            ->assertJsonPath('data.seo', ['title' => 'Custom title', 'description' => 'Custom description']);
    }

    public function test_a_slug_from_another_language_is_not_found(): void
    {
        $this->translation('ola', Locale::PtBr);

        $this->getJson('/api/v1/en/articles/ola')->assertNotFound();
        $this->getJson('/api/v1/pt-br/articles/ola')->assertOk();
    }

    public function test_a_missing_slug_is_a_json_404(): void
    {
        $this->getJson('/api/v1/en/articles/does-not-exist')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Not Found']);
    }

    // Area and cover, in the requested language.

    public function test_area_and_cover_come_in_the_requested_language(): void
    {
        $area = Area::factory()->create();
        AreaTranslation::factory()->for($area)->create(['locale' => Locale::En, 'name' => 'Design', 'slug' => 'design']);
        AreaTranslation::factory()->for($area)->create(['locale' => Locale::Es, 'name' => 'Diseño', 'slug' => 'diseno']);
        $cover = Media::factory()->create(['path' => 'media/cover.webp', 'width' => 1200, 'height' => 630]);
        MediaTranslation::factory()->for($cover)->create(['locale' => Locale::En, 'alt_text' => 'A raven']);
        MediaTranslation::factory()->for($cover)->create(['locale' => Locale::Es, 'alt_text' => 'Un cuervo']);
        $article = Article::factory()->for($area)->for($cover, 'cover')->create();
        $this->translation('hola', Locale::Es, article: $article);

        $this->getJson('/api/v1/es/articles')
            ->assertJsonPath('data.0.area', ['slug' => 'diseno', 'name' => 'Diseño'])
            ->assertJsonPath('data.0.cover.alt', 'Un cuervo')
            ->assertJsonPath('data.0.cover.width', 1200)
            ->assertJsonPath('data.0.cover.height', 630);

        $this->assertStringEndsWith('/media/cover.webp', (string) $this->getJson('/api/v1/es/articles/hola')->json('data.cover.url'));
    }

    public function test_a_cover_without_alternative_text_in_the_language_is_left_out(): void
    {
        $cover = Media::factory()->create();
        MediaTranslation::factory()->for($cover)->create(['locale' => Locale::En]);
        $article = Article::factory()->for($cover, 'cover')->create();
        $this->translation('sem-alt', Locale::PtBr, article: $article);

        $this->getJson('/api/v1/pt-br/articles/sem-alt')->assertOk()->assertJsonPath('data.cover', null);
    }

    // Filtering and pagination.

    public function test_the_list_can_be_filtered_by_area(): void
    {
        $design = AreaTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'design'])->area;
        $qa = AreaTranslation::factory()->create(['locale' => Locale::En, 'slug' => 'qa'])->area;
        $this->translation('about-design', article: Article::factory()->for($design)->create());
        $this->translation('about-qa', article: Article::factory()->for($qa)->create());

        $this->getJson('/api/v1/en/articles?area=design')
            ->assertOk()
            ->assertJsonPath('data.*.slug', ['about-design']);
    }

    public function test_an_area_slug_from_another_language_is_rejected(): void
    {
        AreaTranslation::factory()->create(['locale' => Locale::Es, 'slug' => 'diseno']);

        $this->getJson('/api/v1/en/articles?area=diseno')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('area');
    }

    public function test_the_list_is_paginated_newest_first(): void
    {
        foreach (range(1, 5) as $day) {
            $this->translation("day-$day", publishedAt: now()->subDays(10 - $day));
        }

        $this->getJson('/api/v1/en/articles?per_page=2')
            ->assertJsonPath('data.*.slug', ['day-5', 'day-4'])
            ->assertJsonPath('meta', ['current_page' => 1, 'last_page' => 3, 'per_page' => 2, 'total' => 5]);

        $this->getJson('/api/v1/en/articles?per_page=2&page=3')
            ->assertJsonPath('data.*.slug', ['day-1']);

        $this->getJson('/api/v1/en/articles?per_page=2&page=4')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_the_number_of_queries_does_not_grow_with_the_page(): void
    {
        $count = function (): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson('/api/v1/en/articles')->assertOk();
            DB::disableQueryLog();

            return count(DB::getQueryLog());
        };

        $this->articleWithAreaAndCover('first');
        $withOne = $count();

        foreach (range(2, 10) as $n) {
            $this->articleWithAreaAndCover("article-$n");
        }

        $this->assertSame($withOne, $count());
    }

    public function test_the_default_page_size_is_twelve(): void
    {
        $this->getJson('/api/v1/en/articles')->assertJsonPath('meta.per_page', 12);
    }

    public function test_a_list_item_does_not_carry_the_body(): void
    {
        $this->translation('short');

        $this->assertArrayNotHasKey('body', (array) $this->getJson('/api/v1/en/articles')->json('data.0'));
    }

    // Invalid input: a clear 4xx, never a 500.

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function invalidQueries(): iterable
    {
        yield 'page zero' => ['page=0', 'page'];
        yield 'negative page' => ['page=-1', 'page'];
        yield 'page not a number' => ['page=abc', 'page'];
        yield 'fractional page' => ['page=1.5', 'page'];
        yield 'page as an array' => ['page[]=1', 'page'];
        yield 'huge page' => ['page=99999999999999999999', 'page'];
        yield 'per_page zero' => ['per_page=0', 'per_page'];
        yield 'per_page too large' => ['per_page=51', 'per_page'];
        yield 'per_page as an array' => ['per_page[a]=1', 'per_page'];
        yield 'unknown area' => ['area=nope', 'area'];
        yield 'area with path characters' => ['area=..%2F..%2Fetc', 'area'];
        yield 'area as an array' => ['area[]=design', 'area'];
        yield 'area with SQL' => ['area=design%27%20OR%201%3D1--', 'area'];
        yield 'empty area' => ['area=', 'area'];
    }

    #[DataProvider('invalidQueries')]
    public function test_invalid_query_parameters_are_a_422(string $query, string $field): void
    {
        $this->getJson("/api/v1/en/articles?$query")
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function unknownPaths(): iterable
    {
        yield 'unknown language' => ['/api/v1/fr/articles'];
        yield 'language in upper case' => ['/api/v1/EN/articles'];
        yield 'language with underscore' => ['/api/v1/pt_BR/articles'];
        yield 'unknown version' => ['/api/v2/en/articles'];
        yield 'slug in upper case' => ['/api/v1/en/articles/Hello'];
        yield 'slug with dots' => ['/api/v1/en/articles/..%2F..%2Fetc%2Fpasswd'];
        yield 'slug with a null byte' => ['/api/v1/en/articles/a%00b'];
        yield 'slug with a quote' => ['/api/v1/en/articles/a%27%20or%201%3D1'];
        yield 'slug with a trailing dash' => ['/api/v1/en/articles/hello-'];
        yield 'very long slug' => ['/api/v1/en/articles/'.str_repeat('a', 5000)];
    }

    #[DataProvider('unknownPaths')]
    public function test_unknown_languages_and_malformed_slugs_are_a_json_404(string $path): void
    {
        $this->getJson($path)
            ->assertNotFound()
            ->assertExactJson(['message' => 'Not Found']);
    }

    public function test_writing_is_not_allowed(): void
    {
        $this->translation('hello');

        $this->postJson('/api/v1/en/articles', [])->assertMethodNotAllowed();
        $this->deleteJson('/api/v1/en/articles/hello')->assertMethodNotAllowed();
        $this->putJson('/api/v1/en/articles/hello', [])->assertMethodNotAllowed();
    }

    private function articleWithAreaAndCover(string $slug): void
    {
        $area = AreaTranslation::factory()->create(['locale' => Locale::En])->area;
        $cover = MediaTranslation::factory()->create(['locale' => Locale::En])->media;
        $this->translation($slug, article: Article::factory()->for($area)->for($cover, 'cover')->create());
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function translation(
        string $slug,
        Locale $locale = Locale::En,
        PublicationStatus $status = PublicationStatus::Published,
        mixed $publishedAt = 'yesterday',
        ?Article $article = null,
        array $attributes = [],
    ): ArticleTranslation {
        return ArticleTranslation::factory()
            ->for($article ?? Article::factory())
            ->create([
                'slug' => $slug,
                'locale' => $locale,
                'status' => $status,
                'published_at' => $publishedAt === 'yesterday' ? now()->subDay() : $publishedAt,
            ] + $attributes);
    }
}
