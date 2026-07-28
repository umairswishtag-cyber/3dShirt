<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unique(['user_id', 'shopify_product_id'], 'products_store_shopify_unique');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unique(['user_id', 'shopify_order_id'], 'orders_store_shopify_unique');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_store_shopify_unique');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_store_shopify_unique');
        });
    }
};
