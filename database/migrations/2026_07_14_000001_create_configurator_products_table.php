<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configurator_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('gender', 32)->index();
            $table->string('category', 64)->index();
            $table->text('description')->nullable();
            $table->string('model_path')->nullable();
            $table->string('model_url')->nullable();
            $table->string('model_original_name')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->decimal('fit_height', 8, 3)->default(2.450);
            $table->json('mesh_zones')->nullable();
            $table->json('print_areas')->nullable();
            $table->json('color_zones')->nullable();
            $table->json('allowed_colors')->nullable();
            $table->json('pattern_zones')->nullable();
            $table->boolean('supports_colors')->default(true);
            $table->boolean('supports_patterns')->default(false);
            $table->boolean('supports_logos')->default(false);
            $table->boolean('is_published')->default(false)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configurator_products');
    }
};
