<?php

use App\Enums\Locale;
use App\Enums\PublicationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // What the three language versions of an article share.
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            // An area with articles cannot be deleted by accident.
            $table->foreignId('area_id')->constrained()->restrictOnDelete();
            $table->foreignId('cover_media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('article_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->enum('locale', Locale::values());
            $table->string('slug', 150);
            $table->string('title', 200);
            $table->text('summary');
            // Markdown, rendered and sanitized by the frontend.
            $table->text('body');
            $table->enum('status', PublicationStatus::values())->default(PublicationStatus::Draft->value);
            // Set when published; a future date schedules the publication.
            $table->timestampTz('published_at')->nullable();
            $table->string('seo_title', 70)->nullable();
            $table->string('seo_description', 160)->nullable();
            $table->timestamps();

            $table->unique(['article_id', 'locale']);
            $table->unique(['locale', 'slug']);
            // The public listing: published translations of one language, newest first.
            $table->index(['locale', 'status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_translations');
        Schema::dropIfExists('articles');
    }
};
