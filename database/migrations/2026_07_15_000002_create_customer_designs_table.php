<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_designs', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('configurator_product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_slug');
            $table->string('product_name');
            $table->string('title');
            $table->string('status', 16)->default('draft')->index();
            $table->unsignedSmallInteger('document_version')->default(1);
            $table->longText('document');
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('last_opened_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_designs');
    }
};
