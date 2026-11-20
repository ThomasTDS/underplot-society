<?php

namespace App\Support;

use App\Enums\Locale;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

use function Illuminate\Support\defer;

/**
 * Tells the public site which cached pages to drop after content changes, so an
 * edit in the panel shows up on the next visit without a deploy.
 *
 * Tags pile up during a request and go out in one call after the response is sent
 * (defer), so publishing three translations makes one call, and a slow or absent
 * site never slows down the panel. A failed call is logged, not thrown: the site's
 * cache also expires on its own within minutes.
 *
 * Off when SITE_REVALIDATE_URL or REVALIDATE_SECRET is not set.
 */
final class SiteCache
{
    public const ALL = 'content';

    /** @var array<string, true> */
    private array $pending = [];

    private bool $scheduled = false;

    public function __construct(
        private readonly ?string $url,
        private readonly ?string $secret,
    ) {}

    public function enabled(): bool
    {
        return filled($this->url) && filled($this->secret) && strlen((string) $this->secret) >= 32;
    }

    public function forget(string ...$tags): void
    {
        if (! $this->enabled()) {
            return;
        }

        foreach ($tags as $tag) {
            $this->pending[$tag] = true;
        }

        if (! $this->scheduled) {
            $this->scheduled = true;
            defer(fn () => $this->flush());
        }
    }

    /**
     * Everything an article appears in: its page in every language (also under the
     * slugs it had before this change), and the lists and area filters, where it may
     * have appeared, disappeared or moved.
     *
     * @param  list<array{Locale, string}>  $previousSlugs
     */
    public function forgetArticle(Article $article, array $previousSlugs = []): void
    {
        $tags = [];
        foreach (Locale::cases() as $locale) {
            $tags[] = "articles:{$locale->value}";
            $tags[] = "areas:{$locale->value}";
        }

        foreach ($article->translations()->get(['locale', 'slug']) as $translation) {
            $tags[] = $this->articleTag($translation->locale, $translation->slug);
        }
        foreach ($previousSlugs as [$locale, $slug]) {
            $tags[] = $this->articleTag($locale, $slug);
        }

        $this->forget(...$tags);
    }

    public function forgetTranslation(ArticleTranslation $translation): void
    {
        $previous = [];
        $oldSlug = $translation->getOriginal('slug');
        $oldLocale = $translation->getOriginal('locale');
        if (is_string($oldSlug) && $oldLocale instanceof Locale) {
            $previous[] = [$oldLocale, $oldSlug];
        }
        $previous[] = [$translation->locale, $translation->slug];

        $this->forgetArticle($translation->article, $previous);
    }

    /** Sends the pending tags now. Called after the response; public for tests. */
    public function flush(): void
    {
        $tags = array_keys($this->pending);
        $this->pending = [];
        $this->scheduled = false;

        foreach (array_chunk($tags, 100) as $chunk) {
            try {
                $response = Http::timeout(3)
                    ->withToken((string) $this->secret)
                    ->acceptJson()
                    ->post((string) $this->url, ['tags' => $chunk]);

                if ($response->failed()) {
                    Log::warning('Site cache revalidation was refused.', ['status' => $response->status(), 'tags' => $chunk]);
                }
            } catch (Throwable $e) {
                Log::warning('Site cache revalidation failed.', ['error' => $e->getMessage(), 'tags' => $chunk]);
            }
        }
    }

    private function articleTag(Locale $locale, string $slug): string
    {
        return "article:{$locale->value}:{$slug}";
    }
}
