<?php

namespace App\Http\Controllers;

use App\Services\Shopify\ShopifyAppProxyVerifier;
use App\Services\Shopify\ShopifyCustomerIdentityService;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ShopifyCustomerSessionController extends Controller
{
    public function __construct(
        private readonly ShopifyAppProxyVerifier $proxyVerifier,
        private readonly ShopifyCustomerIdentityService $identities,
        private readonly StorefrontContext $storefront,
    ) {}

    public function proxy(Request $request): Response
    {
        abort_unless($this->proxyVerifier->verify($request), 401, 'Invalid Shopify app proxy signature.');

        $shop = strtolower((string) $request->query('shop'));
        abort_unless(
            preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/', $shop) === 1,
            422,
            'Invalid Shopify shop domain.',
        );

        $store = $this->storefront->resolve($request, $shop);
        $shopifyCustomerId = (string) $request->query('logged_in_customer_id', '');

        if (! ctype_digit($shopifyCustomerId)) {
            return response()
                ->view('shopify.customer-required', [
                    'loginUrl' => 'https://'.$store->name.'/customer_authentication/login?return_to=%2Fpages%2Fconfigurator',
                ])
                ->header('Cache-Control', 'no-store, private');
        }

        $customerEmail = (string) $request->query('customer_email', '');
        $customerName = trim((string) $request->query('customer_name', ''));
        $requestId = (string) $request->query('request_id', '');
        $handoff = Crypt::encryptString(json_encode([
            'shop' => $store->storefront_key,
            'shopify_customer_id' => $shopifyCustomerId,
            'name' => mb_substr($customerName, 0, 120),
            'email' => filter_var($customerEmail, FILTER_VALIDATE_EMAIL)
                ? strtolower($customerEmail)
                : null,
            'request_id' => Str::isUuid($requestId) ? $requestId : null,
            'portal' => $request->boolean('portal'),
        ], JSON_THROW_ON_ERROR));
        $relativeLaunchUrl = URL::temporarySignedRoute(
            'shopify.customer.session',
            now()->addMinutes(2),
            compact('handoff'),
            absolute: false,
        );
        $launchUrl = rtrim((string) config('app.url'), '/').$relativeLaunchUrl;

        return response()
            ->view('shopify.proxy-launch', compact('launchUrl'))
            ->header('Cache-Control', 'no-store, private');
    }

    public function session(
        Request $request,
    ): RedirectResponse {
        try {
            $payload = json_decode(
                Crypt::decryptString((string) $request->query('handoff')),
                true,
                flags: JSON_THROW_ON_ERROR,
            );
        } catch (DecryptException|\JsonException) {
            abort(401, 'Invalid Shopify customer handoff.');
        }

        $store = (string) ($payload['shop'] ?? '');
        $shopifyCustomer = (string) ($payload['shopify_customer_id'] ?? '');
        abort_unless(
            preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/', $store) === 1
                && ctype_digit($shopifyCustomer),
            401,
            'Invalid Shopify customer handoff.',
        );

        $resolvedStore = $this->storefront->resolve($request, $store);
        $customer = $this->identities->sync($resolvedStore, $shopifyCustomer, [
            'name' => (string) ($payload['name'] ?? ''),
            'email' => $payload['email'] ?? null,
            'verified_email' => true,
        ]);

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();

        $requestId = (string) ($payload['request_id'] ?? '');
        if (Str::isUuid($requestId)) {
            abort_unless(
                $customer->productionRequests()->where('public_id', $requestId)->exists(),
                404,
            );

            return redirect()->route('store.customer.requests.show', [
                'store' => $resolvedStore->storefront_key,
                'id' => $requestId,
            ]);
        }

        if ((bool) ($payload['portal'] ?? false)) {
            return redirect()->route('store.customer.dashboard', [
                'store' => $resolvedStore->storefront_key,
            ]);
        }

        return redirect()->route('store.configurator', [
            'store' => $resolvedStore->storefront_key,
            'shopify_page' => 1,
        ]);
    }
}
