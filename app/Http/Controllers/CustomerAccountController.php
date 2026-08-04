<?php

namespace App\Http\Controllers;

use App\Services\Configurator\ConfiguratorCatalogService;
use App\Services\Storefront\StorefrontContext;
use App\Support\ProductionRequestData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerAccountController extends Controller
{
    public function __construct(
        private readonly StorefrontContext $storefront,
        private readonly ConfiguratorCatalogService $catalog,
    ) {}

    public function login(Request $request): Response
    {
        $store = $this->storefront->require($request);

        return Inertia::render('Customer/Auth/Login', [
            'intendedUrl' => $request->session()->get('url.intended', route('store.configurator', ['store' => $store->storefront_key])),
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function register(Request $request): Response
    {
        $store = $this->storefront->require($request);

        return Inertia::render('Customer/Auth/Register', [
            'intendedUrl' => $request->session()->get('url.intended', route('store.configurator', ['store' => $store->storefront_key])),
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $store = $this->storefront->require($request);
        $customer = auth('customer')->user();

        return Inertia::render('Customer/Dashboard', [
            'storefront' => $this->storefront->links($store),
            'catalog' => $this->catalog->publishedCatalog($store),
            'productionRequests' => $customer->productionRequests()
                ->with('product:id,name')
                ->latest('updated_at')
                ->limit(12)
                ->get()
                ->map(fn ($item) => array_merge(ProductionRequestData::make($item), [
                    'url' => route('store.customer.requests.show', [
                        'store' => $store->storefront_key,
                        'id' => $item->public_id,
                    ], false),
                ])),
        ]);
    }
}
