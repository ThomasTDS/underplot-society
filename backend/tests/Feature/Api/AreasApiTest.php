<?php

namespace Tests\Feature\Api;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Area;
use App\Models\AreaTranslation;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreasApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_areas_with_visible_articles_in_the_language_in_order(): void
    {
        $culture = $this->area(2, ['en' => 'Culture', 'pt-br' => 'Cultura']);
        $tech = $this->area(1, ['en' => 'Technology', 'pt-br' => 'Tecnologia']);
        $this->article($culture, Locale::En);
        $this->article($tech, Locale::En);
        $this->article($tech, Locale::PtBr);

        $this->getJson('/api/v1/en/areas')
            ->assertOk()
            ->assertExactJson(['data' => [
                ['slug' => 'technology', 'name' => 'Technology'],
                ['slug' => 'culture', 'name' => 'Culture'],
            ]]);

        $this->getJson('/api/v1/pt-br/areas')
            ->assertOk()
            ->assertExactJson(['data' => [['slug' => 'tecnologia', 'name' => 'Tecnologia']]]);
    }

    public function test_leaves_out_areas_with_only_drafts_or_scheduled_articles(): void
    {
        $drafts = $this->area(1, ['en' => 'Drafts']);
        $scheduled = $this->area(2, ['en' => 'Scheduled']);
        $this->article($drafts, Locale::En, PublicationStatus::Draft);
        $this->article($scheduled, Locale::En, publishedAt: now()->addDay());
        $this->area(3, ['en' => 'Empty']);

        $this->getJson('/api/v1/en/areas')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_leaves_out_an_area_without_a_name_in_the_language(): void
    {
        $unnamed = $this->area(1, ['en' => 'Only English']);
        $this->article($unnamed, Locale::Es);

        $this->getJson('/api/v1/es/areas')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_an_unknown_language_is_a_404(): void
    {
        $this->getJson('/api/v1/fr/areas')->assertNotFound();
    }

    /**
     * @param  array<string, string>  $names  name by locale; the slug is the name in lower case
     */
    private function area(int $position, array $names): Area
    {
        $area = Area::factory()->create(['position' => $position]);
        foreach ($names as $locale => $name) {
            AreaTranslation::factory()->for($area)->create([
                'locale' => $locale,
                'name' => $name,
                'slug' => str_replace(' ', '-', strtolower($name)),
            ]);
        }

        return $area;
    }

    private function article(
        Area $area,
        Locale $locale,
        PublicationStatus $status = PublicationStatus::Published,
        mixed $publishedAt = null,
    ): void {
        ArticleTranslation::factory()
            ->for(Article::factory()->for($area))
            ->create([
                'locale' => $locale,
                'status' => $status,
                'published_at' => $publishedAt ?? now()->subDay(),
            ]);
    }
}
