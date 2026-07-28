<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('storefront_key')->nullable()->unique()->after('is_platform_admin');
        });

        DB::table('users')
            ->where('is_platform_admin', false)
            ->orderBy('id')
            ->get(['id', 'name'])
            ->each(function (object $user): void {
                $name = strtolower(trim((string) $user->name));
                $key = str_ends_with($name, '.myshopify.com')
                    ? $name
                    : (Str::slug($name) ?: 'store').'-'.$user->id;

                DB::table('users')->where('id', $user->id)->update(['storefront_key' => $key]);
            });

        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        $defaultStoreId = DB::table('users')
            ->where('is_platform_admin', false)
            ->orderBy('id')
            ->value('id');

        if ($defaultStoreId) {
            DB::table('customers')->whereNull('user_id')->update(['user_id' => $defaultStoreId]);
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_email_unique');
            $table->unique(['user_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'email']);
            $table->unique('email');
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['storefront_key']);
            $table->dropColumn('storefront_key');
        });
    }
};
