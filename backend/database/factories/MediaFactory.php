<?php

namespace Database\Factories;

use App\Models\Media;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Media>
 */
class MediaFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'disk' => 'public',
            'path' => 'media/'.fake()->unique()->uuid().'.webp',
            'mime_type' => 'image/webp',
            'size_bytes' => fake()->numberBetween(10_000, 500_000),
            'width' => 1200,
            'height' => 630,
        ];
    }
}
