<?php

namespace App\Http\Controllers;

use App\Models\ConfiguratorProduct;
use App\Models\User;
use App\Services\Configurator\ConfiguratorCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\Storefront\StorefrontContext;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontConfiguratorController extends Controller
{
    public function __construct(
        private readonly ConfiguratorCatalogService $catalog,
        private readonly StorefrontContext $storefront,
    ) {}

    public function show(Request $request): Response
    {
        $store = $this->storefront->require($request);

        return Inertia::render('Configurator/ConfiguratorPage', [
            'catalog' => $this->catalog->publishedCatalog($store),
            'adminPreview' => false,
            'initialProductId' => null,
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function preview(Request $request, ?ConfiguratorProduct $product = null): Response
    {
        $admin = $request->user();
        $store = $product?->owner ?? (! $admin->isPlatformAdmin() ? $admin : null);
        abort_unless($store && ($admin->isPlatformAdmin() || (int) $store->id === (int) $admin->id), 404);

        return Inertia::render('Configurator/ConfiguratorPage', [
            'catalog' => $this->catalog->publishedCatalog($store),
            'adminPreview' => true,
            'initialProductId' => $product?->is_published ? $product->slug : null,
            'assistantPreview' => $this->assistantConfig($store),
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function catalog(Request $request): JsonResponse
    {
        $store = $this->storefront->require($request);

        return response()->json(['data' => $this->catalog->publishedCatalog($store)]);
    }

    /** @return array{enabled: bool, position?: string} */
    private function assistantConfig(?User $user): array
    {
        return $user?->chatbotSetting?->storefrontConfig()
            ?? ['enabled' => false];
    }
}
