<?php

namespace App\Http\Controllers;

use App\Services\Configurator\ConfiguratorCatalogService;
use App\Services\Production\ProductionRequestAlertService;
use App\Services\Storefront\StorefrontContext;
use App\Support\ProductionRequestData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerAccountController extends Controller
{
    public function __construct(
        private readonly StorefrontContext $storefront,
        private readonly ConfiguratorCatalogService $catalog,
        private readonly ProductionRequestAlertService $alerts,
    ) {}

    public function login(Request $request): Response|RedirectResponse
    {
        $store = $this->storefront->require($request);

        if (! $request->boolean('local') && $this->storefront->isShopifyStore($store)) {
            return redirect()->away($this->storefront->shopifyCustomerEntryUrl($store));
        }

        return Inertia::render('Customer/Auth/Login', [
            'intendedUrl' => $request->session()->get('url.intended', route('store.configurator', ['store' => $store->storefront_key])),
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function register(Request $request): Response|RedirectResponse
    {
        $store = $this->storefront->require($request);

        if (! $request->boolean('local') && $this->storefront->isShopifyStore($store)) {
            return redirect()->away($this->storefront->shopifyCustomerEntryUrl($store));
        }

        return Inertia::render('Customer/Auth/Register', [
            'intendedUrl' => $request->session()->get('url.intended', route('store.configurator', ['store' => $store->storefront_key])),
            'storefront' => $this->storefront->links($store),
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $store = $this->storefront->require($request);
        $customer = auth('customer')->user();

        $productionRequests = $customer->productionRequests()
            ->with('product:id,name')
            ->latest('updated_at')
            ->limit(12)
            ->get();
        $unread = $this->alerts->countsByRequest($customer, $productionRequests->pluck('id'));

        return Inertia::render('Customer/Dashboard', [
            'storefront' => $this->storefront->links($store),
            'catalog' => $this->catalog->publishedCatalog($store),
            'productionRequests' => $productionRequests
                ->map(fn ($item) => array_merge(ProductionRequestData::make($item), [
                    'unreadMessages' => $unread->get($item->id, 0),
                    'url' => route('store.customer.requests.show', [
                        'store' => $store->storefront_key,
                        'id' => $item->public_id,
                    ], false),
                ])),
        ]);
    }
}
