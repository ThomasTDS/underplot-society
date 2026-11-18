<?php

namespace App\Models;

use App\Enums\Locale;
use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * An uploaded image, stored by App\Media\MediaLibrary. Its alternative text, one per
 * language, lives in MediaTranslation.
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

    protected static function booted(): void
    {
        // The file goes with the record. Articles using it as a cover keep going,
        // without a cover (the foreign key is set to null).
        static::deleted(fn (self $media) => Storage::disk($media->disk)->delete($media->path));
    }

    /**
     * @return HasMany<MediaTranslation, $this>
     */
    public function translations(): HasMany
    {
        return $this->hasMany(MediaTranslation::class);
    }

    /**
     * @return HasMany<Article, $this>
     */
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'cover_media_id');
    }

    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function altText(Locale $locale = Locale::En): ?string
    {
        return $this->translations->first(fn (MediaTranslation $t) => $t->locale === $locale)?->alt_text;
    }
}
