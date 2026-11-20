<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audience metrics without personal data: how many times each page was opened on
 * each day. No address, cookie, user agent or any identifier is stored, only totals.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->date('day');
            $table->string('path', 200);
            $table->string('locale', 5);
            $table->unsignedInteger('views')->default(0);

            $table->unique(['day', 'path']);
            $table->index('path');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
