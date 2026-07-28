<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\Storefront\StorefrontContext;

class CustomerAccountController extends Controller
{
    public function __construct(private readonly StorefrontContext $storefront) {}

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

        return Inertia::render('Customer/Dashboard', [
            'storefront' => $this->storefront->links($store),
        ]);
    }
}
