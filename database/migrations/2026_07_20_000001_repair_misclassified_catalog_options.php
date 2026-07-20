<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('configurator_taxonomies') || ! Schema::hasTable('configurator_products')) {
            return;
        }

        $unisexExists = DB::table('configurator_taxonomies')
            ->where('type', 'audience')
            ->where('slug', 'unisex')
            ->exists();

        if (! $unisexExists) {
            return;
        }

        foreach ([
            'footwears' => ['slug' => 'footwear', 'label' => 'Footwear'],
            'cap' => ['slug' => 'caps', 'label' => 'Caps'],
            'cup' => ['slug' => 'cups', 'label' => 'Cups'],
        ] as $wrongAudience => $category) {
            $source = DB::table('configurator_taxonomies')
                ->where('type', 'audience')
                ->where('slug', $wrongAudience)
                ->first();

            if (! $source) {
                continue;
            }

            $target = DB::table('configurator_taxonomies')
                ->where('type', 'category')
                ->where('slug', $category['slug'])
                ->first();

            if (! $target) {
                $nextOrder = ((int) DB::table('configurator_taxonomies')->where('type', 'category')->max('sort_order')) + 10;
                DB::table('configurator_taxonomies')->insert([
                    'type' => 'category',
                    'slug' => $category['slug'],
                    'label' => $category['label'],
                    'sort_order' => $nextOrder,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('configurator_products')
                ->where('gender', $wrongAudience)
                ->update([
                    'gender' => 'unisex',
                    'category' => $category['slug'],
                    'updated_at' => now(),
                ]);

            DB::table('configurator_taxonomies')->where('id', $source->id)->delete();
        }
    }

    public function down(): void
    {
        // This migration repairs user catalog assignments and is intentionally not reversed.
    }
};
