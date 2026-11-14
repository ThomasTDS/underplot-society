<?php

namespace Database\Factories;

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use App\Models\Article;
use App\Models\ArticleTranslation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ArticleTranslation>
 */
class ArticleTranslationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(5);

        return [
            'article_id' => Article::factory(),
            'locale' => Locale::En,
            'slug' => Str::slug($title),
            'title' => rtrim($title, '.'),
            'summary' => fake()->paragraph(),
            'body' => fake()->paragraphs(3, true),
            'status' => PublicationStatus::Draft,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => PublicationStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }
}
