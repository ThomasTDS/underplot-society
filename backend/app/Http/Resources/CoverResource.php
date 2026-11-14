<?php

namespace App\Http\Resources;

use App\Models\Media;
use App\Models\MediaTranslation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * An article's cover image with its alternative text in one language.
 *
 * @mixin MediaTranslation
 */
class CoverResource extends JsonResource
{
    /**
     * The cover with its alternative text in the language its translations were loaded
     * in. An image without alternative text in that language is not shown (null).
     */
    public static function forLanguage(?Media $media): ?self
    {
        $alt = $media?->translations->first();

        // The image is already loaded: hand it over instead of querying it again.
        return $alt === null ? null : new self($alt->setRelation('media', $media));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'url' => Storage::disk($this->media->disk)->url($this->media->path),
            'alt' => $this->alt_text,
            'width' => $this->media->width,
            'height' => $this->media->height,
        ];
    }
}
