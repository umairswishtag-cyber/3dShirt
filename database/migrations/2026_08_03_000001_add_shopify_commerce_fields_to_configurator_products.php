<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->unsignedBigInteger('shopify_variant_id')->nullable()->after('shopify_product_id');
            $table->unsignedBigInteger('shopify_inventory_item_id')->nullable()->after('shopify_variant_id');
            $table->string('shopify_status', 24)->default('draft')->after('shopify_inventory_item_id');
            $table->decimal('price', 12, 2)->default(0)->after('shopify_status');
            $table->unsignedInteger('inventory_quantity')->default(0)->after('price');
            $table->json('tags')->nullable()->after('inventory_quantity');
            $table->timestamp('shopify_synced_at')->nullable()->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->dropColumn([
                'shopify_variant_id',
                'shopify_inventory_item_id',
                'shopify_status',
                'price',
                'inventory_quantity',
                'tags',
                'shopify_synced_at',
            ]);
        });
    }
};
