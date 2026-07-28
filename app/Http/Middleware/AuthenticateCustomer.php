<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Storefront\StorefrontContext;

class AuthenticateCustomer
{
    public function __construct(private readonly StorefrontContext $storefront) {}

    public function handle(Request $request, Closure $next): Response
    {
        $store = $this->storefront->require($request);
        $customer = Auth::guard('customer')->user();

        if (! $customer || (int) $customer->user_id !== (int) $store->id) {
            $request->session()->put('url.intended', $request->fullUrl());

            return redirect()->route('store.customer.login', ['store' => $store->storefront_key]);
        }

        return $next($request);
    }
}
