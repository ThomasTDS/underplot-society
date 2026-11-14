<?php

namespace Database\Factories;

use App\Enums\Locale;
use App\Models\Area;
use App\Models\AreaTranslation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AreaTranslation>
 */
class AreaTranslationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'area_id' => Area::factory(),
            'locale' => Locale::En,
            'name' => Str::title($name),
            'slug' => Str::slug($name),
        ];
    }
}
