<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configurator_taxonomies', function (Blueprint $table) {
            $table->id();
            $table->string('type', 24);
            $table->string('slug', 64);
            $table->string('label', 80);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['type', 'slug']);
        });

        $now = now();
        DB::table('configurator_taxonomies')->insert([
            ...$this->rows('audience', ['men' => 'Men', 'women' => 'Women', 'kids' => 'Kids', 'old-men' => 'Old Men', 'old-women' => 'Old Women', 'unisex' => 'Unisex'], $now),
            ...$this->rows('category', ['shirts' => 'Shirts', 'dresses' => 'Dresses', 'pants' => 'Pants', 'jackets' => 'Jackets', 'footwear' => 'Footwear', 'caps' => 'Caps', 'hats' => 'Hats'], $now),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('configurator_taxonomies');
    }

    /** @return array<int, array<string, mixed>> */
    private function rows(string $type, array $items, mixed $now): array
    {
        $order = 0;

        return collect($items)->map(function (string $label, string $slug) use ($type, $now, &$order) {
            $order += 10;

            return compact('type', 'slug', 'label', 'order', 'now') + [
                'sort_order' => $order,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->map(fn (array $row) => collect($row)->except(['order', 'now'])->all())->values()->all();
    }
};
