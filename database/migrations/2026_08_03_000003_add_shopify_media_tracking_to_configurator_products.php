<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->string('shopify_media_id')->nullable()->after('shopify_inventory_item_id');
            $table->text('shopify_thumbnail_synced_path')->nullable()->after('shopify_media_id');
        });
    }

    public function down(): void
    {
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->dropColumn(['shopify_media_id', 'shopify_thumbnail_synced_path']);
        });
    }
};
