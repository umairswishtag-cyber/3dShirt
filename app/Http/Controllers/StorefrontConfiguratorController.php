<?php

namespace App\Http\Controllers;

use App\Models\ConfiguratorProduct;
use App\Models\User;
use App\Services\Configurator\ConfiguratorCatalogService;
use App\Services\Production\ProductionRequestAlertService;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontConfiguratorController extends Controller
{
    public function __construct(
        private readonly ConfiguratorCatalogService $catalog,
        private readonly StorefrontContext $storefront,
        private readonly ProductionRequestAlertService $alerts,
    ) {}

    public function show(Request $request): Response
    {
        $store = $this->storefront->require($request);
        $catalog = $this->catalog->publishedCatalog($store);

        $links = $this->storefront->links($store);
        $links['unreadMessageCount'] = $this->alerts->summary(auth('customer')->user())['unreadCount'];

        return Inertia::render('Configurator/ConfiguratorPage', [
            'catalog' => $catalog,
            'adminPreview' => false,
            'initialProductId' => count($catalog) === 1
                ? $catalog[0]['id']
                : null,
            'storefront' => $links,
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
