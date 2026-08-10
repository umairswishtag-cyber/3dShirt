<?php

namespace App\Http\Middleware;

use App\Services\Storefront\StorefrontContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateCustomer
{
    public function __construct(private readonly StorefrontContext $storefront) {}

    public function handle(Request $request, Closure $next): Response
    {
        $store = $this->storefront->require($request);
        $customer = Auth::guard('customer')->user();

        if (! $customer || (int) $customer->user_id !== (int) $store->id) {
            if ($this->storefront->isShopifyStore($store)) {
                $routeName = (string) $request->route()?->getName();
                $requestId = is_string($request->route('id'))
                    ? $request->route('id')
                    : null;
                $portal = $requestId !== null
                    || str_contains($routeName, 'customer.dashboard')
                    || str_contains($routeName, 'customer.requests');

                return redirect()->away(
                    $this->storefront->shopifyCustomerEntryUrl($store, $requestId, $portal),
                );
            }

            $request->session()->put('url.intended', $request->fullUrl());

            return redirect()->route('store.customer.login', ['store' => $store->storefront_key]);
        }

        return $next($request);
    }
}
