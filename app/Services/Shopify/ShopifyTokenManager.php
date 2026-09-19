<?php

namespace App\Services\Shopify;

use App\Models\User;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ShopifyTokenManager
{
    private const REFRESH_BUFFER_SECONDS = 300;

    public function exchangeAuthorizationCode(User $store, string $code): void
    {
        $response = Http::asForm()->post($this->endpoint($store), [
            'client_id' => config('shopify-app.api_key'),
            'client_secret' => config('shopify-app.api_secret'),
            'code' => $code,
            'expiring' => 1,
        ]);

        $this->persist($store, $this->tokenPayload($response));
    }

    public function refreshIfNeeded(User $store): void
    {
        if (! $store->shopify_refresh_token || ! $store->shopify_token_expires_at) {
            return;
        }

        if ($store->shopify_token_expires_at->isAfter(now()->addSeconds(self::REFRESH_BUFFER_SECONDS))) {
            return;
        }

        Cache::lock("shopify-token-refresh:{$store->getKey()}", 30)->block(10, function () use ($store): void {
            $store->refresh();
            if ($store->shopify_token_expires_at?->isAfter(now()->addSeconds(self::REFRESH_BUFFER_SECONDS))) {
                return;
            }

            if (! $store->shopify_refresh_token || $store->shopify_refresh_token_expires_at?->isPast()) {
                throw new RuntimeException('Shopify authorization expired. Open the app from Shopify admin to reconnect it.');
            }

            $response = Http::asForm()->post($this->endpoint($store), [
                'client_id' => config('shopify-app.api_key'),
                'client_secret' => config('shopify-app.api_secret'),
                'grant_type' => 'refresh_token',
                'refresh_token' => $store->shopify_refresh_token,
            ]);

            $this->persist($store, $this->tokenPayload($response));
        });
    }

    private function tokenPayload(Response $response): array
    {
        if (! $response->successful()) {
            throw new RuntimeException('Shopify authorization failed. Open the app from Shopify admin to reconnect it.');
        }

        $data = $response->json();
        foreach (['access_token', 'refresh_token', 'expires_in', 'refresh_token_expires_in'] as $key) {
            if (blank($data[$key] ?? null)) {
                throw new RuntimeException("Shopify did not return {$key} for an expiring offline token.");
            }
        }

        return $data;
    }

    private function persist(User $store, array $data): void
    {
        $store->forceFill([
            'password' => $data['access_token'],
            'password_updated_at' => now(),
            'shopify_refresh_token' => $data['refresh_token'],
            'shopify_token_expires_at' => now()->addSeconds((int) $data['expires_in']),
            'shopify_refresh_token_expires_at' => now()->addSeconds((int) $data['refresh_token_expires_in']),
        ])->save();
        $store->apiHelper = null;
    }

    private function endpoint(User $store): string
    {
        return 'https://'.$store->getDomain()->toNative().'/admin/oauth/access_token';
    }
}
