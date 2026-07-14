<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConfiguratorProductRequest;
use App\Models\ConfiguratorProduct;
use App\Services\Configurator\ConfiguratorAssetStorageService;
use App\Services\Configurator\ConfiguratorProductService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ConfiguratorProductController extends Controller
{
    public function __construct(
        private readonly ConfiguratorProductService $products,
        private readonly ConfiguratorAssetStorageService $storage,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Configurator/ProductsIndex', [
            'products' => ConfiguratorProduct::query()
                ->withCount('patterns')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (ConfiguratorProduct $product) => $this->adminProduct($product)),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Configurator/ProductEditor', [
            'product' => null,
        ]);
    }

    public function store(StoreConfiguratorProductRequest $request): RedirectResponse
    {
        $product = $this->products->create($request->validated(), $request->user()?->id);

        return redirect()->route('admin.configurator.products.edit', $product)
            ->with('success', 'Garment created. You can now add product-specific patterns.');
    }

    public function edit(ConfiguratorProduct $product): Response
    {
        $product->load('patterns');

        return Inertia::render('Admin/Configurator/ProductEditor', [
            'product' => $this->adminProduct($product),
        ]);
    }

    public function update(StoreConfiguratorProductRequest $request, ConfiguratorProduct $product): RedirectResponse
    {
        $this->products->update($product, $request->validated());

        return back()->with('success', 'Garment configuration saved.');
    }

    public function destroy(ConfiguratorProduct $product): RedirectResponse
    {
        $this->products->delete($product);

        return redirect()->route('admin.configurator.products.index')
            ->with('success', 'Garment and its uploaded patterns were deleted.');
    }

    private function adminProduct(ConfiguratorProduct $product): array
    {
        return [
            ...$product->only([
                'id', 'name', 'slug', 'gender', 'category', 'description', 'fit_height',
                'mesh_zones', 'print_areas', 'color_zones', 'allowed_colors', 'pattern_zones',
                'supports_colors', 'supports_patterns', 'supports_logos', 'is_published',
                'sort_order', 'model_original_name', 'created_at', 'updated_at',
            ]),
            'modelUrl' => $this->storage->publicUrl($product->model_path, $product->model_url),
            'thumbnailUrl' => $this->storage->publicUrl($product->thumbnail_path, $product->thumbnail_url),
            'patternsCount' => $product->patterns_count ?? $product->patterns->count(),
            'patterns' => $product->relationLoaded('patterns')
                ? $product->patterns->map(fn ($pattern) => [
                    ...$pattern->only(['id', 'name', 'slug', 'color_slots', 'is_active', 'sort_order']),
                    'assetUrl' => $this->storage->publicUrl($pattern->svg_path, $pattern->svg_url),
                ])->values()
                : [],
        ];
    }
}
