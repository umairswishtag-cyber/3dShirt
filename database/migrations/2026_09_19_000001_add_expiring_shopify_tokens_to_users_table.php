<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('shopify_refresh_token')->nullable()->after('password_updated_at');
            $table->timestamp('shopify_token_expires_at')->nullable()->after('shopify_refresh_token');
            $table->timestamp('shopify_refresh_token_expires_at')->nullable()->after('shopify_token_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['shopify_refresh_token', 'shopify_token_expires_at', 'shopify_refresh_token_expires_at']);
        });
    }
};
