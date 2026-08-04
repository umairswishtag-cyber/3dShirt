<?php

namespace App\Services\Customer;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\DesignCartItem;
use App\Models\Products\Product;
use App\Models\Products\ProductVarient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DesignCartService
{
    /** @param array<string, mixed> $input */
    public function prepare(Customer $customer, array $input): DesignCartItem
    {
        $data = Validator::make($input, [
            'designId' => ['required', 'uuid'],
            'variantId' => ['required', 'regex:/^\d+$/'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ])->validate();

        $design = $customer->designs()
            ->where('public_id', $data['designId'])
            ->with(['product.patterns'])
            ->firstOrFail();

        if (strtoupper($design->status) !== 'FINAL') {
            throw ValidationException::withMessages([
                'designId' => 'Publish the design before requesting a quotation.',
            ]);
        }

        $product = $design->product;
        if (! $product instanceof ConfiguratorProduct || ! $product->is_published || ! $product->shopify_product_id) {
            throw ValidationException::withMessages([
                'variantId' => 'This configurable product is not connected to a Shopify product.',
            ]);
        }

        $shopifyProduct = Product::query()
            ->where('user_id', $customer->user_id)
            ->where('shopify_product_id', $product->shopify_product_id)
            ->where('status', 'active')
            ->first();
        $variant = $shopifyProduct?->productVarients()
            ->where('shopify_product_varient_id', $data['variantId'])
            ->first();

        if (! $variant instanceof ProductVarient) {
            throw ValidationException::withMessages([
                'variantId' => 'The selected Shopify variant is not available for this product.',
            ]);
        }

        $document = json_decode($design->document, true, 512, JSON_THROW_ON_ERROR);
        $snapshot = $this->snapshot($design, $product, $variant, $document);
        $encodedSnapshot = json_encode(
            $snapshot,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
        $summary = $this->summary($design->title, $product, $document);

        return DB::transaction(fn () => DesignCartItem::create([
            'customer_id' => $customer->id,
            'customer_design_id' => $design->id,
            'configurator_product_id' => $product->id,
            'shopify_product_id' => $product->shopify_product_id,
            'shopify_variant_id' => $variant->shopify_product_varient_id,
            'quantity' => $data['quantity'],
            'snapshot_sha256' => hash('sha256', $encodedSnapshot),
            'snapshot' => $snapshot,
            'summary' => $summary,
        ]));
    }

    /** @return array<int, array{key: string, value: string}> */
    public function cartProperties(DesignCartItem $item): array
    {
        $summary = $item->summary;

        return [
            ['key' => 'Design', 'value' => $summary['design']],
            ['key' => 'Colors', 'value' => $summary['colors']],
            ['key' => 'Pattern', 'value' => $summary['pattern']],
            ['key' => 'Artwork', 'value' => $summary['artwork']],
            ['key' => 'Customization ID', 'value' => $item->public_id],
            ['key' => '_3d_job_id', 'value' => $item->public_id],
            ['key' => '_3d_design_id', 'value' => $item->design?->public_id ?? 'snapshot'],
            ['key' => '_3d_design_hash', 'value' => $item->snapshot_sha256],
        ];
    }

    /** @param array<string, mixed> $document */
    private function snapshot(
        mixed $design,
        ConfiguratorProduct $product,
        ProductVarient $variant,
        array $document,
    ): array {
        return [
            'schemaVersion' => 1,
            'preparedAt' => now()->toIso8601String(),
            'design' => [
                'id' => $design->public_id,
                'title' => $design->title,
                'status' => strtoupper($design->status),
                'documentVersion' => $design->document_version,
                'finalizedAt' => $design->finalized_at?->toIso8601String(),
                'document' => $document,
            ],
            'product' => [
                'id' => $product->slug,
                'name' => $product->name,
                'sourceModelPath' => $product->model_path,
                'sourceModelUrl' => $product->model_url,
                'meshZones' => $product->mesh_zones ?? [],
                'printAreas' => $product->print_areas ?? [],
                'colorZones' => $product->color_zones ?? [],
                'patternZones' => $product->pattern_zones ?? [],
                'patterns' => $product->patterns->map(fn ($pattern) => [
                    'id' => $pattern->slug,
                    'name' => $pattern->name,
                    'sourcePath' => $pattern->svg_path,
                    'colorSlots' => $pattern->color_slots ?? [],
                ])->values()->all(),
            ],
            'shopify' => [
                'productId' => (string) $product->shopify_product_id,
                'variantId' => (string) $variant->shopify_product_varient_id,
                'variantTitle' => $variant->title,
                'sku' => $variant->sku,
            ],
        ];
    }

    /** @param array<string, mixed> $document */
    private function summary(string $designTitle, ConfiguratorProduct $product, array $document): array
    {
        $zoneLabels = collect($product->color_zones ?? [])
            ->mapWithKeys(function (mixed $zone): array {
                if (is_string($zone)) {
                    return [$zone => $zone];
                }

                return [($zone['id'] ?? '') => ($zone['label'] ?? $zone['id'] ?? '')];
            });
        $colors = collect($document['shirtColors'] ?? [])
            ->map(fn (mixed $color, string $zone): string => ($zoneLabels[$zone] ?? $zone).': '.strtoupper((string) $color))
            ->values()
            ->implode(', ');

        $patternId = $document['selectedPatternId'] ?? null;
        $pattern = $patternId
            ? $product->patterns->firstWhere('slug', $patternId)
            : null;
        $patternColors = $patternId
            ? collect($document['patternColors'][$patternId] ?? [])->map(
                fn (mixed $color, string $slot): string => $slot.' '.strtoupper((string) $color),
            )->implode(', ')
            : '';
        $enabledPatternAreas = collect($document['patternZones'] ?? [])
            ->filter()
            ->keys()
            ->implode(', ');

        $artwork = collect($document['designObjects'] ?? [])
            ->filter(fn (mixed $object): bool => is_array($object) && ($object['type'] ?? null) === 'image');
        $artworkAreas = $artwork->pluck('areaId')->filter()->unique()->implode(', ');

        return [
            'design' => mb_substr($designTitle, 0, 255),
            'colors' => mb_substr($colors !== '' ? $colors : 'Default', 0, 255),
            'pattern' => mb_substr(
                $pattern
                    ? $pattern->name.($enabledPatternAreas ? " ({$enabledPatternAreas})" : '').($patternColors ? " — {$patternColors}" : '')
                    : 'None',
                0,
                255,
            ),
            'artwork' => mb_substr(
                $artwork->isEmpty()
                    ? 'None'
                    : $artwork->count().' logo'.($artwork->count() === 1 ? '' : 's').($artworkAreas ? " ({$artworkAreas})" : ''),
                0,
                255,
            ),
        ];
    }
}
