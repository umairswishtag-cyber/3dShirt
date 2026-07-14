<?php

namespace App\Services\Configurator;

use App\Models\ConfiguratorPattern;
use App\Models\ConfiguratorProduct;

class ConfiguratorCatalogService
{
    public function __construct(
        private readonly ConfiguratorAssetStorageService $storage,
    ) {}

    /** @return array<int, array<string, mixed>> */
    public function publishedCatalog(): array
    {
        return ConfiguratorProduct::query()
            ->where('is_published', true)
            ->where(fn ($query) => $query->whereNotNull('model_path')->orWhereNotNull('model_url'))
            ->with(['patterns' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ConfiguratorProduct $product) => $this->storefrontProduct($product))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public function storefrontProduct(ConfiguratorProduct $product): array
    {
        $zones = collect($product->color_zones ?? [])->map(function ($zone) {
            if (is_string($zone)) {
                return ['id' => $zone, 'label' => $zone, 'defaultColor' => '#F8FAFC'];
            }

            return [
                'id' => $zone['id'],
                'label' => $zone['label'] ?? $zone['id'],
                'defaultColor' => strtoupper($zone['defaultColor'] ?? '#F8FAFC'),
            ];
        })->values();

        return [
            'id' => $product->slug,
            'databaseId' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'gender' => $product->gender,
            'category' => $product->category,
            'thumbnailUrl' => $this->storage->publicUrl($product->thumbnail_path, $product->thumbnail_url),
            'model' => [
                'url' => $this->storage->publicUrl($product->model_path, $product->model_url),
                'fitHeight' => $product->fit_height,
                'meshZones' => $product->mesh_zones ?? [],
                'printAreas' => $product->print_areas ?? [],
            ],
            'colorZones' => $zones->pluck('id')->all(),
            'colorZoneOptions' => $zones->all(),
            'defaultColors' => $zones->mapWithKeys(fn ($zone) => [$zone['id'] => $zone['defaultColor']])->all(),
            'allowedColors' => $product->allowed_colors ?? [],
            'patternZones' => $product->pattern_zones ?? [],
            'capabilities' => [
                'solidColors' => $product->supports_colors,
                'patterns' => $product->supports_patterns,
                'logos' => $product->supports_logos,
            ],
            'patterns' => $product->patterns
                ->map(fn (ConfiguratorPattern $pattern) => [
                    'id' => $pattern->slug,
                    'name' => $pattern->name,
                    'assetUrl' => $this->storage->publicUrl($pattern->svg_path, $pattern->svg_url),
                    'colors' => $pattern->color_slots ?? [],
                ])
                ->values()
                ->all(),
        ];
    }
}
