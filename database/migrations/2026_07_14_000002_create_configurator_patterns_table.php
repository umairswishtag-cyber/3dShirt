<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configurator_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('configurator_product_id')
                ->constrained('configurator_products')
                ->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('svg_path')->nullable();
            $table->string('svg_url')->nullable();
            $table->string('svg_original_name')->nullable();
            $table->json('color_slots')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['configurator_product_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configurator_patterns');
    }
};
