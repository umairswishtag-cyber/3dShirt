<?php

namespace App\Http\Middleware;

use App\Services\Shopify\ShopifyAppProxyVerifier;
use App\Services\Shopify\ShopifyCustomerIdentityService;
use App\Services\Storefront\StorefrontContext;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateShopifyProxyCustomer
{
    public function __construct(
        private readonly ShopifyAppProxyVerifier $proxyVerifier,
        private readonly ShopifyCustomerIdentityService $identities,
        private readonly StorefrontContext $storefront,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->proxyVerifier->verify($request)) {
            return $this->error('Invalid Shopify app proxy signature.', 401);
        }

        $shop = strtolower((string) $request->query('shop'));
        if (preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/', $shop) !== 1) {
            return $this->error('Invalid Shopify shop domain.', 422);
        }

        $store = $this->storefront->resolve($request, $shop);
        $shopifyCustomerId = (string) $request->query('logged_in_customer_id', '');

        if (! ctype_digit($shopifyCustomerId)) {
            return response()->json([
                'message' => 'Please sign in with Shopify before opening the configurator.',
                'loginUrl' => 'https://'.$store->name.'/customer_authentication/login?return_to=%2Fpages%2Fconfigurator',
            ], 401, ['Cache-Control' => 'no-store, private']);
        }

        $customerEmail = (string) $request->query('customer_email', '');
        $customerName = trim((string) $request->query('customer_name', ''));
        $customer = $this->identities->sync($store, $shopifyCustomerId, [
            'name' => mb_substr($customerName, 0, 120),
            'email' => filter_var($customerEmail, FILTER_VALIDATE_EMAIL)
                ? strtolower($customerEmail)
                : null,
            'verified_email' => true,
        ]);

        // App-proxy requests are authenticated independently on every request.
        // No third-party iframe cookie or Laravel login page is required.
        Auth::guard('customer')->setUser($customer);
        $request->attributes->set('shopify.customer', $customer);

        return $next($request);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(
            ['message' => $message],
            $status,
            ['Cache-Control' => 'no-store, private'],
        );
    }
}
