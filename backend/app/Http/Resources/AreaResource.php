<?php

namespace App\Http\Resources;

use App\Models\Area;
use App\Models\AreaTranslation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An area in one language.
 *
 * @mixin AreaTranslation
 */
class AreaResource extends JsonResource
{
    /**
     * The area in the language its translations were loaded in, or null when it has
     * no translation in that language.
     */
    public static function forLanguage(Area $area): ?self
    {
        $translation = $area->translations->first();

        return $translation === null ? null : new self($translation);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
        ];
    }
}
