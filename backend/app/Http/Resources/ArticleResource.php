<?php

namespace App\Http\Resources;

use App\Models\ArticleTranslation;
use App\Support\Markdown;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A full article in one language. Expects what ArticleSummaryResource expects, plus
 * article.translations holding only the visible translations.
 *
 * @mixin ArticleTranslation
 */
class ArticleResource extends JsonResource
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
            /** Markdown. */
            'body' => $this->body,
            /**
             * The body as HTML, sanitized on the server (App\Support\Markdown): no
             * script, style, iframe, form or event handler, and only http, https and
             * mailto links. Headings start at h2: the article title is the page's h1.
             */
            'body_html' => Markdown::toHtml($this->body, topHeading: 2)->toHtml(),
            'seo' => [
                'title' => $this->seo_title ?? $this->title,
                'description' => $this->seo_description ?? $this->summary,
            ],
            /** @format date-time */
            'updated_at' => $this->updated_at?->toIso8601String(),
            /**
             * Slug of this article in each language it is published in, keyed by
             * language, for the language switcher and hreflang links.
             *
             * @var array<string, string>
             */
            'translations' => $this->article->translations
                ->sortBy(fn (ArticleTranslation $t) => $t->locale->value)
                ->mapWithKeys(fn (ArticleTranslation $t) => [$t->locale->value => $t->slug])
                ->all(),
        ];
    }
}
