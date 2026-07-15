<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('auth_provider', 32)->default('local');
            $table->string('provider_subject')->nullable()->index();
            $table->string('shopify_customer_gid')->nullable()->index();
            $table->rememberToken();
            $table->timestamps();

            $table->unique(['auth_provider', 'provider_subject']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
