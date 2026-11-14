<?php

namespace App\Http\Resources;

use App\Models\ArticleTranslation;
use Illuminate\Http\Request;

/**
 * A full article in one language. Besides what the summary has, it expects
 * article.translations to hold only the visible translations, which become the
 * links to the other languages.
 *
 * @mixin ArticleTranslation
 */
class ArticleResource extends ArticleSummaryResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ArticleTranslation $translation */
        $translation = $this->resource;

        return parent::toArray($request) + [
            'body' => $translation->body,
            'seo' => [
                'title' => $translation->seo_title ?? $translation->title,
                'description' => $translation->seo_description ?? $translation->summary,
            ],
            'updated_at' => $translation->updated_at?->toIso8601String(),
            // Slug of this article in each language it is published in, for the
            // language switcher and hreflang links.
            'translations' => $translation->article->translations
                ->sortBy(fn (ArticleTranslation $t) => $t->locale->value)
                ->mapWithKeys(fn (ArticleTranslation $t) => [$t->locale->value => $t->slug])
                ->all(),
        ];
    }
}
