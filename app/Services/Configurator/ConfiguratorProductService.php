<?php

namespace App\Services\Configurator;

use App\Models\ConfiguratorPattern;
use App\Models\ConfiguratorProduct;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConfiguratorProductService
{
    public function __construct(
        private readonly ConfiguratorAssetStorageService $storage,
        private readonly SvgPatternService $svgPatterns,
        private readonly ShopifyCatalogSyncService $shopifyCatalog,
    ) {}

    public function create(array $data, ?int $userId): ConfiguratorProduct
    {
        $product = DB::transaction(function () use ($data, $userId) {
            $attributes = $this->productAttributes($data);
            $attributes['user_id'] = $userId;
            $attributes['slug'] = $this->uniqueSlug($data['name'], $userId);
            $this->applyUploads($attributes, $data);

            $product = ConfiguratorProduct::create($attributes);

            if (($data['pattern_svg'] ?? null) instanceof UploadedFile) {
                $this->addPattern($product, [
                    'name' => $data['pattern_name'],
                    'svg' => $data['pattern_svg'],
                    'is_active' => Arr::get($data, 'pattern_is_active', true),
                    'sort_order' => 0,
                ]);
            }

            return $product;
        });

        $this->syncShopifyCatalog($product);

        return $product->refresh();
    }

    public function update(ConfiguratorProduct $product, array $data): ConfiguratorProduct
    {
        $product = DB::transaction(function () use ($product, $data) {
            $attributes = $this->productAttributes($data);
            $this->applyUploads($attributes, $data, $product);
            $product->update($attributes);

            return $product->refresh();
        });

        $this->syncShopifyCatalog($product);

        return $product->refresh();
    }

    public function delete(ConfiguratorProduct $product): void
    {
        DB::transaction(function () use ($product) {
            $product->load('patterns');
            $this->storage->delete($product->model_path);
            $this->storage->delete($product->thumbnail_path);
            $product->patterns->each(fn (ConfiguratorPattern $pattern) => $this->storage->delete($pattern->svg_path));
            $product->delete();
        });
    }

    public function addPattern(ConfiguratorProduct $product, array $data): ConfiguratorPattern
    {
        $processed = $this->svgPatterns->process($data['svg']);

        return $product->patterns()->create([
            'name' => $data['name'],
            'slug' => $this->uniquePatternSlug($product, $data['name']),
            'svg_path' => $processed['path'],
            'svg_original_name' => $processed['original_name'],
            'color_slots' => $processed['color_slots'],
            'is_active' => Arr::get($data, 'is_active', false),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);
    }

    public function updatePattern(ConfiguratorPattern $pattern, array $data): ConfiguratorPattern
    {
        $pattern->update([
            'name' => $data['name'],
            'is_active' => Arr::get($data, 'is_active', false),
            'sort_order' => $data['sort_order'] ?? 0,
            'color_slots' => $data['color_slots'] ?? $pattern->color_slots,
        ]);

        return $pattern->refresh();
    }

    public function deletePattern(ConfiguratorPattern $pattern): void
    {
        $this->storage->delete($pattern->svg_path);
        $pattern->delete();
    }

    private function productAttributes(array $data): array
    {
        return [
            'shopify_status' => $data['shopify_status'] ?? 'draft',
            'price' => $data['price'] ?? 0,
            'inventory_quantity' => $data['inventory_quantity'] ?? 0,
            'tags' => collect(explode(',', (string) ($data['tags'] ?? '')))
                ->map(fn (string $tag) => trim($tag))
                ->filter()
                ->unique(fn (string $tag) => strtolower($tag))
                ->values()
                ->all(),
            'name' => $data['name'],
            'gender' => $data['gender'],
            'category' => $data['category'],
            'description' => $data['description'] ?? null,
            'fit_height' => $data['fit_height'] ?? 2.45,
            'mesh_zones' => $data['mesh_zones'] ?? [],
            'print_areas' => $data['print_areas'] ?? [],
            'color_zones' => $data['color_zones'] ?? [],
            'allowed_colors' => $data['allowed_colors'] ?? [],
            'pattern_zones' => $data['pattern_zones'] ?? [],
            'supports_colors' => Arr::get($data, 'supports_colors', false),
            'supports_patterns' => Arr::get($data, 'supports_patterns', false),
            'supports_logos' => Arr::get($data, 'supports_logos', false),
            'is_published' => Arr::get($data, 'is_published', false),
            'sort_order' => $data['sort_order'] ?? 0,
        ];
    }

    private function syncShopifyCatalog(ConfiguratorProduct $product): void
    {
        $store = $product->owner()->first();
        if ($store && $this->shopifyCatalog->shouldSync($store)) {
            $this->shopifyCatalog->sync($product, $store);
        }
    }

    private function applyUploads(array &$attributes, array $data, ?ConfiguratorProduct $product = null): void
    {
        if (($data['model'] ?? null) instanceof UploadedFile) {
            $this->storage->delete($product?->model_path);
            $attributes['model_path'] = $this->storage->storeModel($data['model']);
            $attributes['model_url'] = null;
            $attributes['model_original_name'] = $data['model']->getClientOriginalName();
        }

        if (($data['thumbnail'] ?? null) instanceof UploadedFile) {
            $this->storage->delete($product?->thumbnail_path);
            $attributes['thumbnail_path'] = $this->storage->storeThumbnail($data['thumbnail']);
            $attributes['thumbnail_url'] = null;
        }
    }

    private function uniqueSlug(string $name, ?int $userId): string
    {
        $base = Str::slug($name) ?: 'garment';
        $slug = $base;
        $counter = 2;
        while (ConfiguratorProduct::where('user_id', $userId)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter++;
        }

        return $slug;
    }

    private function uniquePatternSlug(ConfiguratorProduct $product, string $name): string
    {
        $base = Str::slug($name) ?: 'pattern';
        $slug = $base;
        $counter = 2;
        while ($product->patterns()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter++;
        }

        return $slug;
    }
}
