<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->dropUnique('configurator_products_slug_unique');
            $table->unique(['user_id', 'slug'], 'configurator_products_store_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->dropUnique('configurator_products_store_slug_unique');
            $table->unique('slug');
        });
    }
};
