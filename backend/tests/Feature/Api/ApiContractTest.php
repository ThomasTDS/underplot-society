<?php

namespace Tests\Feature\Api;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Models\MediaTranslation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Osteel\OpenApi\Testing\Exceptions\ValidationException;
use Osteel\OpenApi\Testing\ValidatorBuilder;
use Osteel\OpenApi\Testing\ValidatorInterface;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Real responses checked against the committed openapi.json. If the code starts
 * returning something the document does not describe, these tests fail.
 */
class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = ValidatorBuilder::fromJsonFile(base_path('openapi.json'))->getValidator();
    }

    public function test_the_article_list_matches_the_document(): void
    {
        $this->publishedArticle('with-everything', withAreaAndCover: true);
        $this->publishedArticle('without-area-or-cover', withAreaAndCover: false);

        $response = $this->getJson('/api/v1/en/articles')->assertOk()->assertJsonCount(2, 'data');

        $this->assertMatches($response, '/v1/{locale}/articles');
    }

    public function test_an_empty_article_list_matches_the_document(): void
    {
        $this->assertMatches($this->getJson('/api/v1/es/articles')->assertOk(), '/v1/{locale}/articles');
    }

    public function test_a_single_article_matches_the_document(): void
    {
        $this->publishedArticle('with-everything', withAreaAndCover: true);
        $this->publishedArticle('without-area-or-cover', withAreaAndCover: false);

        foreach (['with-everything', 'without-area-or-cover'] as $slug) {
            $this->assertMatches($this->getJson("/api/v1/en/articles/$slug")->assertOk(), '/v1/{locale}/articles/{slug}');
        }
    }

    public function test_a_missing_article_matches_the_document(): void
    {
        $this->assertMatches(
            $this->getJson('/api/v1/en/articles/missing')->assertNotFound(),
            '/v1/{locale}/articles/{slug}',
        );
    }

    public function test_a_validation_error_matches_the_document(): void
    {
        $this->assertMatches(
            $this->getJson('/api/v1/en/articles?page=0')->assertUnprocessable(),
            '/v1/{locale}/articles',
        );
    }

    public function test_the_health_check_matches_the_document(): void
    {
        $this->assertMatches($this->getJson('/api/health')->assertOk(), '/health');
    }

    /**
     * Guards the guard: a response that breaks the document must be refused.
     */
    public function test_a_response_that_breaks_the_document_is_refused(): void
    {
        $this->publishedArticle('hello', withAreaAndCover: false);
        $body = (array) $this->getJson('/api/v1/en/articles/hello')->json();
        unset($body['data']['title']);

        $this->expectException(ValidationException::class);
        $this->validator->get(
            new Response((string) json_encode($body), 200, ['Content-Type' => 'application/json']),
            '/v1/{locale}/articles/{slug}',
        );
    }

    /**
     * @param  TestResponse<Response>  $response
     */
    private function assertMatches(TestResponse $response, string $path): void
    {
        $this->assertTrue($this->validator->get($response->baseResponse, $path));
    }

    private function publishedArticle(string $slug, bool $withAreaAndCover): void
    {
        $article = Article::factory()->create();

        if ($withAreaAndCover) {
            $article->area_id = AreaTranslation::factory()->create(['locale' => Locale::En])->area_id;
            $article->cover_media_id = MediaTranslation::factory()->create(['locale' => Locale::En])->media_id;
            $article->save();
        }

        ArticleTranslation::factory()->for($article)->create([
            'slug' => $slug,
            'locale' => Locale::En,
            'status' => PublicationStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }
}
