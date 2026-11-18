<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Models\Area;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Database\Seeder;

/**
 * For the end-to-end tests only: an article whose title, summary and body try every
 * usual way to run a script. Each attempt sets window.__xss; the test checks it never
 * gets set. Needs SampleContentSeeder first (for the area). Not for staging.
 */
class XssProbeSeeder extends Seeder
{
    public const SLUG = 'xss-probe';

    public const BODY = <<<'MD'
        Text before the attacks.

        <script>window.__xss = 'script tag'</script>

        <img src=x onerror="window.__xss = 'img onerror'">

        <svg onload="window.__xss = 'svg onload'"></svg>

        <iframe src="javascript:window.__xss = 'iframe'"></iframe>

        <a href="javascript:window.__xss = 'raw link'">raw link</a>

        [markdown link](javascript:window.__xss='markdown%20link')

        ![image](javascript:window.__xss='image')

        <details open ontoggle="window.__xss = 'details'"><summary>x</summary></details>

        [autolink]: <javascript:window.__xss='reference'>

        Text after the attacks.
        MD;

    public function run(): void
    {
        if (ArticleTranslation::where('locale', Locale::En)->where('slug', self::SLUG)->exists()) {
            return;
        }

        $area = Area::orderBy('position')->firstOrFail();
        $article = Article::create(['area_id' => $area->id]);
        foreach (Locale::cases() as $locale) {
            $article->translations()->create([
                'locale' => $locale,
                'slug' => self::SLUG,
                'title' => 'XSS probe <script>window.__xss = "title"</script>',
                'summary' => '<img src=x onerror="window.__xss = \'summary\'">',
                'body' => self::BODY,
            ]);
        }
        $article->publish(now()->subYear());
    }
}
