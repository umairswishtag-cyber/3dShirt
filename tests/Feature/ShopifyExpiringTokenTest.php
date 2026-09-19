<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Shopify\ShopifyTokenManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ShopifyExpiringTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorization_code_exchange_stores_expiring_token_pair(): void
    {
        Http::fake(['*/admin/oauth/access_token' => Http::response($this->tokenResponse('access-one', 'refresh-one'))]);
        $store = User::factory()->create(['name' => 'token-test.myshopify.com']);

        app(ShopifyTokenManager::class)->exchangeAuthorizationCode($store, 'authorization-code');

        $store->refresh();
        $this->assertSame('access-one', $store->password);
        $this->assertSame('refresh-one', $store->shopify_refresh_token);
        $this->assertTrue($store->shopify_token_expires_at->isFuture());
        $this->assertTrue($store->shopify_refresh_token_expires_at->isFuture());
        Http::assertSent(fn ($request) => $request['code'] === 'authorization-code' && $request['expiring'] === 1);
    }

    public function test_expiring_token_is_refreshed_and_rotated_before_api_use(): void
    {
        Http::fake(['*/admin/oauth/access_token' => Http::response($this->tokenResponse('access-two', 'refresh-two'))]);
        $store = User::factory()->create([
            'name' => 'token-test.myshopify.com',
            'password' => 'access-one',
            'shopify_refresh_token' => 'refresh-one',
            'shopify_token_expires_at' => now()->addMinute(),
            'shopify_refresh_token_expires_at' => now()->addDays(30),
        ]);

        app(ShopifyTokenManager::class)->refreshIfNeeded($store);

        $store->refresh();
        $this->assertSame('access-two', $store->password);
        $this->assertSame('refresh-two', $store->shopify_refresh_token);
        Http::assertSent(fn ($request) => $request['grant_type'] === 'refresh_token' && $request['refresh_token'] === 'refresh-one');
    }

    private function tokenResponse(string $accessToken, string $refreshToken): array
    {
        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => 3600,
            'refresh_token_expires_in' => 7776000,
            'scope' => 'read_products,write_products',
        ];
    }
}
