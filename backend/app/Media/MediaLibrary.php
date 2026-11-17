<?php

namespace App\Media;

use App\Enums\Locale;
use App\Models\Media;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Accepts images for the site. Every rule lives here, not in the admin panel:
 *
 * - only JPEG, PNG and WebP, recognised by their content, never by the file name or
 *   the type the browser claims (an SVG, a script or anything renamed .jpg is refused);
 * - at most 5 MB and 16 megapixels, so decoding fits in the server's memory;
 * - the image is decoded and encoded again as WebP, at most 2400 pixels wide. Only
 *   pixels survive: metadata (camera, GPS position) and anything hidden in or
 *   appended to the file are dropped;
 * - stored under a random name, never the uploaded one;
 * - alternative text is required in every language.
 */
final class MediaLibrary
{
    public const DISK = 'public';

    public const MAX_BYTES = 5 * 1024 * 1024;

    public const MAX_PIXELS = 16_000_000;

    public const MAX_WIDTH = 2400;

    public const MAX_ALT_LENGTH = 300;

    /** Content type => the image type getimagesize() must agree on. */
    public const ACCEPTED = [
        'image/jpeg' => IMAGETYPE_JPEG,
        'image/png' => IMAGETYPE_PNG,
        'image/webp' => IMAGETYPE_WEBP,
    ];

    private const WEBP_QUALITY = 82;

    /**
     * @param  array<string, string|null>  $altTexts  alternative text keyed by language code
     *
     * @throws InvalidMedia
     */
    public function store(UploadedFile $file, array $altTexts): Media
    {
        $altTexts = $this->checkAltTexts($altTexts);
        $image = $this->decode($file);

        try {
            $image = $this->limitWidth($image);
            $encoded = $this->encodeWebp($image);
            $width = imagesx($image);
            $height = imagesy($image);
        } finally {
            imagedestroy($image);
        }

        $path = 'media/'.Str::uuid7()->toString().'.webp';

        if (! Storage::disk(self::DISK)->put($path, $encoded)) {
            throw new InvalidMedia('The image could not be saved. Try again.');
        }

        try {
            return DB::transaction(function () use ($path, $encoded, $width, $height, $altTexts) {
                $media = Media::create([
                    'disk' => self::DISK,
                    'path' => $path,
                    'mime_type' => 'image/webp',
                    'size_bytes' => strlen($encoded),
                    'width' => $width,
                    'height' => $height,
                ]);

                foreach ($altTexts as $locale => $text) {
                    $media->translations()->create(['locale' => $locale, 'alt_text' => $text]);
                }

                return $media;
            });
        } catch (Throwable $e) {
            Storage::disk(self::DISK)->delete($path);

            throw $e;
        }
    }

    /**
     * @param  array<string, string|null>  $altTexts
     *
     * @throws InvalidMedia
     */
    public function updateAltTexts(Media $media, array $altTexts): void
    {
        $altTexts = $this->checkAltTexts($altTexts);

        DB::transaction(function () use ($media, $altTexts) {
            foreach ($altTexts as $locale => $text) {
                $media->translations()->updateOrCreate(['locale' => $locale], ['alt_text' => $text]);
            }
        });
    }

    /**
     * @param  array<string, string|null>  $altTexts
     * @return array<string, string>
     *
     * @throws InvalidMedia
     */
    private function checkAltTexts(array $altTexts): array
    {
        $checked = [];

        foreach (Locale::cases() as $locale) {
            $text = trim((string) ($altTexts[$locale->value] ?? ''));

            if ($text === '') {
                throw new InvalidMedia("Alternative text is required in every language ({$locale->label()} is missing).");
            }

            if (mb_strlen($text) > self::MAX_ALT_LENGTH) {
                throw new InvalidMedia("Alternative text in {$locale->label()} is longer than ".self::MAX_ALT_LENGTH.' characters.');
            }

            $checked[$locale->value] = $text;
        }

        return $checked;
    }

    /**
     * @throws InvalidMedia
     */
    private function decode(UploadedFile $file): GdImage
    {
        $path = $file->getRealPath();

        if (! $file->isValid() || $path === false) {
            throw new InvalidMedia('The upload did not arrive complete. Try again.');
        }

        $size = filesize($path);

        if ($size === false || $size === 0 || $size > self::MAX_BYTES) {
            throw new InvalidMedia('The image must be at most 5 MB.');
        }

        // The content decides, not the name or what the browser said.
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        $info = @getimagesize($path);

        if (! is_string($mime) || ! isset(self::ACCEPTED[$mime]) || $info === false || $info[2] !== self::ACCEPTED[$mime]) {
            throw new InvalidMedia('Only JPEG, PNG and WebP images are accepted.');
        }

        [$width, $height] = $info;

        if ($width < 1 || $height < 1 || $width * $height > self::MAX_PIXELS) {
            throw new InvalidMedia('The image must be at most 16 megapixels.');
        }

        $bytes = file_get_contents($path);
        $image = $bytes === false ? false : @imagecreatefromstring($bytes);

        if ($image === false) {
            throw new InvalidMedia('The image could not be read. It may be damaged.');
        }

        return $image;
    }

    /**
     * @throws InvalidMedia
     */
    private function limitWidth(GdImage $image): GdImage
    {
        if (imagesx($image) <= self::MAX_WIDTH) {
            return $image;
        }

        $scaled = imagescale($image, self::MAX_WIDTH, -1, IMG_BICUBIC);

        if ($scaled === false) {
            throw new InvalidMedia('The image could not be resized.');
        }

        imagedestroy($image);

        return $scaled;
    }

    /**
     * @throws InvalidMedia
     */
    private function encodeWebp(GdImage $image): string
    {
        // Keep transparency from PNG and WebP.
        if (! imageistruecolor($image)) {
            imagepalettetotruecolor($image);
        }
        imagealphablending($image, false);
        imagesavealpha($image, true);

        ob_start();
        $ok = imagewebp($image, null, self::WEBP_QUALITY);
        $encoded = (string) ob_get_clean();

        if (! $ok || $encoded === '') {
            throw new InvalidMedia('The image could not be converted.');
        }

        return $encoded;
    }
}
