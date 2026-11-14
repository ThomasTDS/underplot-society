<?php

use App\Enums\Locale;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A subject used to filter articles (Development, Design, QA...).
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('area_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->constrained()->cascadeOnDelete();
            $table->enum('locale', Locale::values());
            $table->string('name', 100);
            $table->string('slug', 100);
            $table->timestamps();

            $table->unique(['area_id', 'locale']);
            // The slug appears in URLs under the language prefix, so it only has to be
            // unique within one language.
            $table->unique(['locale', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('area_translations');
        Schema::dropIfExists('areas');
    }
};
