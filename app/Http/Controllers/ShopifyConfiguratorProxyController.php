<?php

namespace App\Http\Controllers;

use App\Services\Configurator\ConfiguratorCatalogService;
use App\Services\Production\ProductionRequestAlertService;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShopifyConfiguratorProxyController extends Controller
{
    public function __construct(
        private readonly ConfiguratorCatalogService $catalog,
        private readonly StorefrontContext $storefront,
        private readonly ProductionRequestAlertService $alerts,
    ) {}

    public function bootstrap(Request $request): JsonResponse
    {
        $store = $this->storefront->require($request);
        $catalog = collect($this->catalog->publishedCatalog($store))
            ->map(fn (array $product): array => $this->proxyProductAssets($product))
            ->values()
            ->all();
        $links = $this->storefront->links($store);
        $links['configuratorUrl'] = '/pages/configurator';
        $links['portalUrl'] = '/apps/configurator?portal=1';
        $customer = $request->attributes->get('shopify.customer');
        $links['unreadMessageCount'] = $this->alerts->summary($customer)['unreadCount'];

        return response()->json([
            'catalog' => $catalog,
            'initialProductId' => count($catalog) === 1
                ? $catalog[0]['id']
                : null,
            'storefront' => $links,
            'customer' => [
                'name' => $customer?->name,
                'email' => $customer?->email,
            ],
        ], 200, ['Cache-Control' => 'no-store, private']);
    }

    public function asset(Request $request, string $path): StreamedResponse
    {
        $path = ltrim(rawurldecode($path), '/');
        $customer = $request->attributes->get('shopify.customer');
        $isConfiguratorAsset = str_starts_with($path, 'configurator/');
        $isCustomerAsset = $customer
            && str_starts_with($path, 'customer-designs/'.$customer->public_id.'/');

        abort_unless(
            ! preg_match('#(^|/)\.\.?(/|$)#', $path)
                && ($isConfiguratorAsset || $isCustomerAsset)
                && Storage::disk('public')->exists($path),
            404,
        );

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => $isCustomerAsset
                ? 'private, max-age=86400'
                : 'public, max-age=86400',
        ]);
    }

    /** @param array<string, mixed> $product */
    private function proxyProductAssets(array $product): array
    {
        $product['thumbnailUrl'] = $this->proxyAssetUrl($product['thumbnailUrl'] ?? null);
        $product['model']['url'] = $this->proxyAssetUrl($product['model']['url'] ?? null);
        $product['patterns'] = collect($product['patterns'] ?? [])
            ->map(function (array $pattern): array {
                $pattern['assetUrl'] = $this->proxyAssetUrl($pattern['assetUrl'] ?? null);

                return $pattern;
            })
            ->all();

        return $product;
    }

    private function proxyAssetUrl(?string $url): ?string
    {
        if (! $url || ! str_starts_with($url, '/storage/configurator/')) {
            return $url;
        }

        $path = substr($url, strlen('/storage/'));
        $encodedPath = collect(explode('/', $path))
            ->map(fn (string $segment): string => rawurlencode($segment))
            ->implode('/');

        return '/apps/configurator/assets/'.$encodedPath;
    }
}
