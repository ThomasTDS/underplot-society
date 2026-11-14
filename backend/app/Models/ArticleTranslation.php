<?php

namespace App\Models;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ArticleTranslationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
 */
#[Fillable([
    'locale', 'slug', 'title', 'summary', 'body', 'status', 'published_at',
    'seo_title', 'seo_description',
])]
class ArticleTranslation extends Model
{
    /** @use HasFactory<ArticleTranslationFactory> */
    use HasFactory;

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
     * @return BelongsTo<Article, $this>
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
