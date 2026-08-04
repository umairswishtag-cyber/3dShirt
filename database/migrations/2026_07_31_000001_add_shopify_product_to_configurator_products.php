<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->unsignedBigInteger('shopify_product_id')
                ->nullable()
                ->after('user_id')
                ->index();
        });
    }

    public function down(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->dropIndex(['shopify_product_id']);
            $table->dropColumn('shopify_product_id');
        });
    }
};
