<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('design_cart_items', function (Blueprint $table) {
            $table->string('payment_status', 24)->default('not_requested')->index()->after('status');
            $table->unsignedInteger('quote_version')->default(0)->after('payment_status');
            $table->decimal('quoted_unit_price', 12, 2)->nullable();
            $table->decimal('shipping_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('quote_total', 12, 2)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->text('quote_notes')->nullable();
            $table->timestamp('quote_expires_at')->nullable();
            $table->timestamp('quoted_at')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('customer_responded_at')->nullable();
            $table->timestamp('payment_cleared_at')->nullable();
            $table->timestamp('print_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('customer_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('shopify_draft_order_id')->nullable()->index();
            $table->string('shopify_draft_order_name')->nullable();
            $table->text('shopify_invoice_url')->nullable();
            $table->timestamp('shopify_invoice_sent_at')->nullable();
            $table->unsignedBigInteger('shopify_order_id')->nullable()->index();
        });

        Schema::create('production_request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('design_cart_item_id')->constrained()->cascadeOnDelete();
            $table->string('actor_type', 16)->default('system');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('event', 48);
            $table->string('from_status', 24)->nullable();
            $table->string('to_status', 24)->nullable();
            $table->text('note')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['design_cart_item_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_request_events');

        Schema::table('design_cart_items', function (Blueprint $table) {
            $table->dropColumn([
                'payment_status', 'quote_version', 'quoted_unit_price', 'shipping_amount',
                'tax_amount', 'discount_amount', 'quote_total', 'currency', 'quote_notes',
                'quote_expires_at', 'quoted_at', 'requested_at', 'reviewed_at',
                'customer_responded_at', 'payment_cleared_at', 'print_started_at',
                'completed_at', 'customer_note', 'admin_note', 'payment_reference',
                'shopify_draft_order_id', 'shopify_draft_order_name', 'shopify_invoice_url',
                'shopify_invoice_sent_at', 'shopify_order_id',
            ]);
        });
    }
};
