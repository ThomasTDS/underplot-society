<?php

namespace App\Models;

use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An uploaded file. Its alternative text, one per language, lives in MediaTranslation.
 *
 * @property int $id
 * @property string $disk
 * @property string $path
 * @property string $mime_type
 * @property int $size_bytes
 * @property int|null $width
 * @property int|null $height
 */
#[Table('media')]
#[Fillable(['disk', 'path', 'mime_type', 'size_bytes', 'width', 'height'])]
class Media extends Model
{
    /** @use HasFactory<MediaFactory> */
    use HasFactory;

    /**
     * @return HasMany<MediaTranslation, $this>
     */
    public function translations(): HasMany
    {
        return $this->hasMany(MediaTranslation::class);
    }
}
