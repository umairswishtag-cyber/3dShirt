<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_cart_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_design_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('configurator_product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('shopify_product_id');
            $table->unsignedBigInteger('shopify_variant_id');
            $table->unsignedInteger('quantity')->default(1);
            $table->string('status', 24)->default('prepared')->index();
            $table->char('snapshot_sha256', 64);
            $table->longText('snapshot');
            $table->json('summary');
            $table->string('final_model_path')->nullable();
            $table->json('print_area_paths')->nullable();
            $table->json('logo_paths')->nullable();
            $table->string('pattern_path')->nullable();
            $table->timestamp('assets_uploaded_at')->nullable();
            $table->timestamp('ordered_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'created_at']);
            $table->index(['shopify_variant_id', 'status']);
        });

        Schema::table('order_line_items', function (Blueprint $table) {
            $table->foreignId('design_cart_item_id')
                ->nullable()
                ->after('order_id')
                ->constrained()
                ->nullOnDelete();
            $table->json('customization_properties')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('order_line_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('design_cart_item_id');
            $table->dropColumn('customization_properties');
        });

        Schema::dropIfExists('design_cart_items');
    }
};
