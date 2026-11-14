<?php

namespace Database\Factories;

use App\Enums\Locale;
use App\Models\Media;
use App\Models\MediaTranslation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MediaTranslation>
 */
class MediaTranslationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'media_id' => Media::factory(),
            'locale' => Locale::En,
            'alt_text' => fake()->sentence(),
        ];
    }
}
