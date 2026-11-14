<?php

namespace App\Http\Resources;

use App\Models\Area;
use App\Models\ArticleTranslation;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * An article in one language, as shown in lists. Expects the translation to be loaded
 * with article.area.translations and article.cover.translations limited to its language.
 *
 * @mixin ArticleTranslation
 */
class ArticleSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ArticleTranslation $translation */
        $translation = $this->resource;
        $article = $translation->article;

        return [
            'slug' => $translation->slug,
            'locale' => $translation->locale->value,
            'title' => $translation->title,
            'summary' => $translation->summary,
            'published_at' => $translation->published_at?->toIso8601String(),
            'area' => $this->area($article->area),
            'cover' => $this->cover($article->cover),
        ];
    }

    /**
     * @return array{slug: string, name: string}|null
     */
    private function area(Area $area): ?array
    {
        $translation = $area->translations->first();

        return $translation === null ? null : ['slug' => $translation->slug, 'name' => $translation->name];
    }

    /**
     * @return array{url: string, alt: string, width: int|null, height: int|null}|null
     */
    private function cover(?Media $media): ?array
    {
        $alt = $media?->translations->first();

        // An image without alternative text in this language is not shown.
        if ($media === null || $alt === null) {
            return null;
        }

        return [
            'url' => Storage::disk($media->disk)->url($media->path),
            'alt' => $alt->alt_text,
            'width' => $media->width,
            'height' => $media->height,
        ];
    }
}
