<?php

namespace App\Models;

use App\Enums\Locale;
use Database\Factories\AreaTranslationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $area_id
 * @property Locale $locale
 * @property string $name
 * @property string $slug
 * @property-read Area $area
 */
#[Fillable(['locale', 'name', 'slug'])]
class AreaTranslation extends Model
{
    /** @use HasFactory<AreaTranslationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'locale' => Locale::class,
        ];
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
