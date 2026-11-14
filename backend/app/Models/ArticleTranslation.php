<?php

namespace App\Models;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ArticleTranslationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One language version of an article.
 *
 * @property int $id
 * @property int $article_id
 * @property Locale $locale
 * @property string $slug
 * @property string $title
 * @property string $summary
 * @property string $body Markdown
 * @property PublicationStatus $status
 * @property CarbonImmutable|null $published_at
 * @property string|null $seo_title
 * @property string|null $seo_description
 * @property-read Article $article
 */
#[Fillable([
    'locale', 'slug', 'title', 'summary', 'body', 'status', 'published_at',
    'seo_title', 'seo_description',
])]
class ArticleTranslation extends Model
{
    /** @use HasFactory<ArticleTranslationFactory> */
    use HasFactory;

    /** Lowercase words separated by single hyphens; the same pattern the API routes accept. */
    public const SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    protected static function booted(): void
    {
        // Published without a date means published now.
        static::saving(function (self $translation) {
            if ($translation->status === PublicationStatus::Published && $translation->published_at === null) {
                $translation->published_at = CarbonImmutable::now();
            }
        });
    }

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'draft',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'locale' => Locale::class,
            'status' => PublicationStatus::class,
            'published_at' => 'immutable_datetime',
        ];
    }

    /**
     * What readers may see: published, with a publication time that has arrived.
     * Drafts and scheduled translations are left out.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function visible(Builder $query): void
    {
        $query->where('status', PublicationStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function inLocale(Builder $query, Locale $locale): void
    {
        $query->where('locale', $locale);
    }

    /**
     * @return BelongsTo<Article, $this>
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
