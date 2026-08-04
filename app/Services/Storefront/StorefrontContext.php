<?php

namespace App\Services\Storefront;

use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StorefrontContext
{
    public const ATTRIBUTE = 'storefront.store';

    public const SESSION_KEY = 'storefront.store_id';

    public function resolve(Request $request, ?string $key = null): User
    {
        $key ??= is_string($request->route('store')) ? $request->route('store') : null;

        if ($key) {
            $store = User::query()
                ->where(fn ($query) => $query
                    ->where('storefront_key', strtolower($key))
                    ->orWhere('name', strtolower($key)))
                ->first();
        } elseif ($request->session()->has(self::SESSION_KEY)) {
            $store = User::query()->find($request->session()->get(self::SESSION_KEY));
        } else {
            $candidates = User::query()
                ->where('is_platform_admin', false)
                ->get()
                ->reject->isPlatformAdmin();
            $store = $candidates->count() === 1 ? $candidates->first() : null;
        }

        if (! $store || $store->isPlatformAdmin()) {
            throw new NotFoundHttpException('Storefront not found.');
        }

        $request->attributes->set(self::ATTRIBUTE, $store);
        $request->session()->put(self::SESSION_KEY, $store->id);

        return $store;
    }

    public function current(?Request $request = null): ?User
    {
        $request ??= request();
        $store = $request->attributes->get(self::ATTRIBUTE);

        if ($store instanceof User) {
            return $store;
        }

        $id = $request->session()->get(self::SESSION_KEY);

        return $id ? User::query()->find($id) : null;
    }

    public function require(?Request $request = null): User
    {
        return $this->current($request)
            ?? throw new NotFoundHttpException('Choose a store before opening the storefront.');
    }

    /** @return array<string, string> */
    public function links(User $store): array
    {
        $parameters = ['store' => $store->storefront_key];
        $shopifyStoreUrl = 'https://'.$store->name;

        return [
            'key' => $store->storefront_key,
            'name' => $store->name,
            'loginUrl' => route('store.customer.login', $parameters, false),
            'registerUrl' => route('store.customer.register', $parameters, false),
            'configuratorUrl' => route('store.configurator', $parameters, false),
            'dashboardUrl' => route('store.customer.dashboard', $parameters, false),
            'requestsUrl' => route('store.customer.dashboard', $parameters, false).'#production-requests',
            'shopifyStoreUrl' => $shopifyStoreUrl,
            'shopifyConfiguratorUrl' => $shopifyStoreUrl.'/pages/configurator',
            'shopifyAccountUrl' => $shopifyStoreUrl.'/account',
            'shopifyLoginUrl' => $shopifyStoreUrl.'/customer_authentication/login?return_to=%2Fpages%2Fconfigurator',
        ];
    }
}
