<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Area;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Database\Seeder;

/**
 * For the end-to-end tests only: an article published in English and Portuguese,
 * with the Spanish translation taken back to draft, to test the language fallback
 * notice. Needs SampleContentSeeder first (for the area). Not for staging.
 */
class PartialTranslationSeeder extends Seeder
{
    public const SLUGS = ['en' => 'partial-probe', 'pt-br' => 'sonda-parcial', 'es' => 'sonda-parcial-es'];

    public function run(): void
    {
        if (ArticleTranslation::where('locale', Locale::En)->where('slug', self::SLUGS['en'])->exists()) {
            return;
        }

        $article = Article::create(['area_id' => Area::orderBy('position')->firstOrFail()->id]);
        foreach (self::SLUGS as $locale => $slug) {
            $article->translations()->create([
                'locale' => $locale,
                'slug' => $slug,
                'title' => "Partial probe ({$locale})",
                'summary' => 'Published in English and Portuguese only.',
                'body' => 'Published in English and Portuguese only.',
            ]);
        }
        $article->publish(now()->subYears(2));
        $article->translations()->where('locale', Locale::Es)->update(['status' => PublicationStatus::Draft]);
    }
}
