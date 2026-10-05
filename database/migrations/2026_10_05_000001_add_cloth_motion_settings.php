<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('can_configure_cloth_motion')->default(false);
        });
        Schema::table('configurator_products', function (Blueprint $table) {
            $table->json('cloth_motion')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('configurator_products', fn (Blueprint $table) => $table->dropColumn('cloth_motion'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('can_configure_cloth_motion'));
    }
};
