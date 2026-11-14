<?php

namespace App\Models;

use App\Enums\Locale;
use Database\Factories\AreaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A subject used to filter articles. Its name and slug are translated.
 *
 * @property int $id
 * @property int $position
 */
#[Fillable(['position'])]
class Area extends Model
{
    /** @use HasFactory<AreaFactory> */
    use HasFactory;

    /**
     * @return HasMany<AreaTranslation, $this>
     */
    public function translations(): HasMany
    {
        return $this->hasMany(AreaTranslation::class);
    }

    /**
     * @return HasMany<Article, $this>
     */
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    /**
     * The name shown in the admin panel: the English one, or any if English is missing.
     */
    public function label(): string
    {
        $translation = $this->translations->first(fn (AreaTranslation $t) => $t->locale === Locale::En)
            ?? $this->translations->first();

        return $translation === null ? "Area #{$this->id}" : $translation->name;
    }
}
