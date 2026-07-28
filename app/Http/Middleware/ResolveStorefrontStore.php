<?php

namespace App\Http\Middleware;

use App\Services\Storefront\StorefrontContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveStorefrontStore
{
    public function __construct(private readonly StorefrontContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $store = $this->context->resolve($request);
        $customer = Auth::guard('customer')->user();

        if ($customer && (int) $customer->user_id !== (int) $store->id) {
            Auth::guard('customer')->logout();
            $request->session()->regenerate();
            $request->session()->put(StorefrontContext::SESSION_KEY, $store->id);
        }

        return $next($request);
    }
}
