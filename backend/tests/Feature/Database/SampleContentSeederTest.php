<?php

namespace Tests\Feature\Database;

use App\Models\ArticleTranslation;
use Database\Seeders\PartialTranslationSeeder;
use Database\Seeders\SampleContentSeeder;
use Database\Seeders\XssProbeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SampleContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_samples_are_published_in_every_language_and_running_again_adds_nothing(): void
    {
        $this->seed(SampleContentSeeder::class);
        $this->seed(SampleContentSeeder::class);

        $this->assertSame(9, ArticleTranslation::count());
        foreach (['en', 'pt-br', 'es'] as $locale) {
            $this->getJson("/api/v1/{$locale}/articles")->assertOk()->assertJsonPath('meta.total', 3);
            $this->getJson("/api/v1/{$locale}/areas")->assertOk()->assertJsonCount(2, 'data');
        }
    }

    public function test_the_xss_probe_is_published_and_reaches_the_api_harmless(): void
    {
        $this->seed([SampleContentSeeder::class, XssProbeSeeder::class, XssProbeSeeder::class]);

        $html = $this->getJson('/api/v1/es/articles/'.XssProbeSeeder::SLUG)->assertOk()->json('data.body_html');

        $this->assertStringContainsString('Text after the attacks.', $html);
        // The attacks may remain as visible, escaped text; none may remain as markup.
        $this->assertDoesNotMatchRegularExpression('/<(script|svg|iframe|details)\b/i', $html);
        $this->assertDoesNotMatchRegularExpression('/\s(href|src)="?\s*javascript/i', $html);
        $this->assertDoesNotMatchRegularExpression('/<[^>]+\son\w+=/i', $html);
    }

    public function test_the_partial_probe_is_visible_in_english_and_portuguese_only(): void
    {
        $this->seed([SampleContentSeeder::class, PartialTranslationSeeder::class, PartialTranslationSeeder::class]);

        $this->getJson('/api/v1/en/articles/partial-probe')
            ->assertOk()
            ->assertJsonPath('data.translations', ['en' => 'partial-probe', 'pt-br' => 'sonda-parcial']);
        $this->getJson('/api/v1/es/articles/sonda-parcial-es')->assertNotFound();
    }
}
