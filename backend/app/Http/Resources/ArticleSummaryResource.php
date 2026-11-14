<?php

namespace App\Http\Resources;

use App\Models\ArticleTranslation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
        return [
            'slug' => $this->slug,
            'locale' => $this->locale,
            'title' => $this->title,
            'summary' => $this->summary,
            /** @format date-time */
            'published_at' => $this->published_at?->toIso8601String(),
            'area' => AreaResource::forLanguage($this->article->area),
            'cover' => CoverResource::forLanguage($this->article->cover),
        ];
    }
}
