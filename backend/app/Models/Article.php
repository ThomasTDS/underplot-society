<?php

namespace App\Models;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\ArticleFactory;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * What the language versions of an article share: its area and cover image.
 * Text, slug and publication state live in ArticleTranslation.
 *
 * @property int $id
 * @property int $area_id
 * @property int|null $cover_media_id
 * @property-read Area $area
 * @property-read Media|null $cover
 */
#[Fillable(['area_id', 'cover_media_id'])]
class Article extends Model
{
    /** @use HasFactory<ArticleFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return BelongsTo<Media, $this>
     */
    public function cover(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'cover_media_id');
    }

    /**
     * @return HasMany<ArticleTranslation, $this>
     */
    public function translations(): HasMany
    {
        return $this->hasMany(ArticleTranslation::class);
    }

    /**
     * Languages this article has no translation in yet.
     *
     * @return list<Locale>
     */
    public function missingLocales(): array
    {
        $present = $this->translations()->pluck('locale')->map(fn ($l) => $l instanceof Locale ? $l : Locale::from($l));

        return array_values(array_filter(
            Locale::cases(),
            fn (Locale $locale) => ! $present->contains($locale),
        ));
    }

    /**
     * Publishes every translation, now or at $at (scheduling). Every article goes out
     * in all three languages, so this refuses an article that is missing one.
     * Publishing now keeps the original date of a translation published before.
     *
     * @throws DomainException when a translation is missing
     */
    public function publish(?CarbonInterface $at = null): void
    {
        $missing = $this->missingLocales();

        if ($missing !== []) {
            throw new DomainException('Missing translations: '.implode(', ', array_map(fn (Locale $l) => $l->value, $missing)).'.');
        }

        $now = CarbonImmutable::now();

        DB::transaction(function () use ($at, $now) {
            foreach ($this->translations()->get() as $translation) {
                $keepsDate = $at === null && $translation->published_at !== null && $translation->published_at->lessThanOrEqualTo($now);

                $translation->status = PublicationStatus::Published;
                $translation->published_at = $keepsDate ? $translation->published_at : CarbonImmutable::instance($at ?? $now);
                $translation->save();
            }
        });
    }

    /**
     * Takes every translation off the site (back to draft). The publication date is
     * kept, so publishing again restores it.
     */
    public function unpublish(): void
    {
        $this->translations()->update(['status' => PublicationStatus::Draft]);
    }
}
