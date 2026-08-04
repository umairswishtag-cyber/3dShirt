<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\CustomerDesign;
use App\Models\DesignCartItem;
use App\Models\User;
use App\Services\Shopify\ShopifyCustomerIdentityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Mockery\MockInterface;
use Tests\TestCase;

class ShopifyCustomerSsoTest extends TestCase
{
    use RefreshDatabase;

    private User $store;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.url', 'https://umair.xoarhigh.info');
        config()->set('shopify-app.api_secret', 'proxy-test-secret');
        $this->store = User::factory()->create([
            'name' => 'abc-store.myshopify.com',
            'storefront_key' => 'abc-store.myshopify.com',
        ]);
    }

    public function test_valid_shopify_proxy_request_creates_a_signed_customer_handoff(): void
    {
        $response = $this->get($this->proxyUrl('123456789'));

        $response
            ->assertOk()
            ->assertSee('Opening your customer portal')
            ->assertSee('https://umair.xoarhigh.info/shopify/customer/session?', false)
            ->assertDontSee('abc-store.myshopify.com/shopify/customer/session?', false)
            ->assertSee('shopify/customer/session?', false)
            ->assertDontSee('buyer@example.com');
    }

    public function test_native_embed_bootstrap_uses_the_signed_shopify_customer(): void
    {
        $this->getJson($this->proxyUrl('123456789', '/bootstrap'))
            ->assertOk()
            ->assertJsonPath('storefront.key', 'abc-store.myshopify.com')
            ->assertJsonPath('storefront.configuratorUrl', '/pages/configurator')
            ->assertJsonPath('storefront.shopifyStoreUrl', 'https://abc-store.myshopify.com')
            ->assertJsonPath('storefront.shopifyConfiguratorUrl', 'https://abc-store.myshopify.com/pages/configurator')
            ->assertJsonPath('customer.name', 'Shopify Buyer')
            ->assertJsonPath('initialProductId', null)
            ->assertJsonPath('catalog', []);

        $this->assertDatabaseHas('customers', [
            'user_id' => $this->store->id,
            'email' => 'buyer@example.com',
            'provider_subject' => 'abc-store.myshopify.com:123456789',
        ]);
    }

    public function test_native_embed_opens_its_only_published_product_directly(): void
    {
        ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Only Shopify Cap',
            'slug' => 'only-shopify-cap',
            'gender' => 'unisex',
            'category' => 'caps',
            'model_url' => '/models/only-shopify-cap.glb',
            'is_published' => true,
        ]);

        $this->getJson($this->proxyUrl('123456789', '/bootstrap'))
            ->assertOk()
            ->assertJsonCount(1, 'catalog')
            ->assertJsonPath('initialProductId', 'only-shopify-cap');
    }

    public function test_native_embed_graphql_authenticates_each_request_through_the_proxy(): void
    {
        $this->postJson(
            $this->proxyUrl('123456789', '/graphql'),
            ['query' => '{ customerMe { name email } }'],
            ['X-Requested-With' => 'XMLHttpRequest'],
        )
            ->assertOk()
            ->assertJsonPath('data.customerMe.name', 'Shopify Buyer')
            ->assertJsonPath('data.customerMe.email', 'buyer@example.com');
    }

    public function test_native_embed_stores_and_serves_customer_logo_through_the_signed_proxy(): void
    {
        Storage::fake('public');
        $png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

        $response = $this->postJson(
            $this->proxyUrl('123456789', '/graphql'),
            [
                'query' => <<<'GRAPHQL'
                    mutation StoreLogo($input: StoreCustomerDesignAssetInput!) {
                        storeMyDesignAsset(input: $input) { url }
                    }
                GRAPHQL,
                'variables' => [
                    'input' => ['name' => 'storefront-logo.png', 'dataUrl' => $png],
                ],
            ],
            ['X-Requested-With' => 'XMLHttpRequest'],
        )
            ->assertOk()
            ->assertJsonMissingPath('errors');

        $url = $response->json('data.storeMyDesignAsset.url');
        $this->assertStringStartsWith('/apps/configurator/assets/customer-designs/', $url);
        $storagePath = substr($url, strlen('/apps/configurator/assets/'));
        Storage::disk('public')->assertExists($storagePath);

        $assetPath = substr($url, strlen('/apps/configurator'));
        $this->get($this->proxyUrl('123456789', $assetPath))
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->get($this->proxyUrl('987654321', $assetPath, 'another-buyer@example.com'))
            ->assertNotFound();
    }

    public function test_native_embed_requires_a_logged_in_shopify_customer(): void
    {
        $this->getJson($this->proxyUrl('', '/bootstrap'))
            ->assertUnauthorized()
            ->assertJsonPath('loginUrl', 'https://abc-store.myshopify.com/customer_authentication/login?return_to=%2Fpages%2Fconfigurator');
    }

    public function test_native_embed_uploads_private_final_glb_and_print_areas_for_prepared_job(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $this->getJson($this->proxyUrl('123456789', '/bootstrap'))->assertOk();
        $customer = Customer::query()->where('user_id', $this->store->id)->firstOrFail();
        $logoPath = 'customer-designs/'.$customer->public_id.'/team-logo.png';
        Storage::disk('public')->put(
            $logoPath,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        );
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Production Shirt',
            'slug' => 'production-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/production-shirt.glb',
            'print_areas' => [
                'front' => ['meshName' => 'Body'],
                'back' => ['meshName' => 'Body'],
            ],
            'is_published' => true,
        ]);
        $design = CustomerDesign::query()->create([
            'customer_id' => $customer->id,
            'configurator_product_id' => $product->id,
            'product_slug' => $product->slug,
            'product_name' => $product->name,
            'title' => 'Production design',
            'status' => 'final',
            'document' => '{}',
            'finalized_at' => now(),
        ]);
        $job = DesignCartItem::query()->create([
            'customer_id' => $customer->id,
            'customer_design_id' => $design->id,
            'configurator_product_id' => $product->id,
            'shopify_product_id' => 111,
            'shopify_variant_id' => 222,
            'quantity' => 1,
            'snapshot_sha256' => str_repeat('a', 64),
            'snapshot' => [
                'schemaVersion' => 1,
                'design' => [
                    'document' => [
                        'designObjects' => [[
                            'id' => 'team-logo',
                            'type' => 'image',
                            'source' => '/apps/configurator/assets/'.$logoPath,
                        ]],
                    ],
                ],
                'product' => ['printAreas' => $product->print_areas],
            ],
            'summary' => ['design' => 'Production design'],
        ]);

        $this->post($this->proxyUrl('123456789', '/production-assets/'.$job->public_id), [
            'final_model' => UploadedFile::fake()->createWithContent(
                'final-model.glb',
                'glTF'.str_repeat("\0", 1024),
            ),
            'print_areas' => [
                UploadedFile::fake()->image('front.png', 2048, 2048),
                UploadedFile::fake()->image('back.png', 2048, 2048),
            ],
            'print_area_ids' => ['front', 'back'],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('status', 'submitted');

        $job->refresh();
        $this->assertSame('submitted', $job->status);
        $this->assertNotNull($job->assets_uploaded_at);
        Storage::disk('local')->assertExists($job->final_model_path);
        Storage::disk('local')->assertExists($job->print_area_paths['front']);
        Storage::disk('local')->assertExists($job->print_area_paths['back']);
        Storage::disk('local')->assertExists($job->logo_paths['0-team-logo']);
    }

    public function test_invalid_shopify_proxy_signature_is_rejected(): void
    {
        $this->get('/shopify/app-proxy/configurator?shop=abc-store.myshopify.com&timestamp='.time().'&signature=invalid')
            ->assertUnauthorized();
    }

    public function test_proxy_without_a_shopify_customer_requests_shopify_sign_in(): void
    {
        $this->get($this->proxyUrl(''))
            ->assertOk()
            ->assertSee('Sign in with Shopify')
            ->assertSee('abc-store.myshopify.com/customer_authentication/login', false);
    }

    public function test_signed_handoff_logs_in_the_synced_shopify_customer(): void
    {
        $customer = Customer::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Shopify Customer',
            'email' => 'shopify@example.com',
            'auth_provider' => 'shopify',
            'provider_subject' => 'abc-store.myshopify.com:123456789',
            'shopify_customer_gid' => 'gid://shopify/Customer/123456789',
        ]);
        $this->mock(
            ShopifyCustomerIdentityService::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('sync')
                ->once()
                ->withArgs(fn (User $store, string $id, array $profile): bool => $store->is($this->store)
                    && $id === '123456789'
                    && $profile['name'] === 'Shopify Buyer'
                    && $profile['email'] === 'buyer@example.com')
                ->andReturn($customer),
        );
        $handoff = Crypt::encryptString(json_encode([
            'shop' => $this->store->storefront_key,
            'shopify_customer_id' => '123456789',
            'name' => 'Shopify Buyer',
            'email' => 'buyer@example.com',
        ], JSON_THROW_ON_ERROR));
        $url = URL::temporarySignedRoute(
            'shopify.customer.session',
            now()->addMinute(),
            compact('handoff'),
            absolute: false,
        );

        $this->get($url)
            ->assertRedirect(route('store.configurator', [
                'store' => $this->store->storefront_key,
                'shopify_page' => 1,
            ]));
        $this->assertAuthenticatedAs($customer, 'customer');
    }

    public function test_signed_handoff_can_open_the_submitted_production_request(): void
    {
        $customer = Customer::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Shopify Customer',
            'email' => 'shopify@example.com',
            'auth_provider' => 'shopify',
            'provider_subject' => 'abc-store.myshopify.com:123456789',
            'shopify_customer_gid' => 'gid://shopify/Customer/123456789',
        ]);
        $productionRequest = DesignCartItem::query()->create([
            'customer_id' => $customer->id,
            'shopify_product_id' => 123,
            'shopify_variant_id' => 456,
            'status' => 'submitted',
            'snapshot_sha256' => str_repeat('a', 64),
            'snapshot' => ['schemaVersion' => 1],
            'summary' => ['design' => 'Shopify design'],
            'requested_at' => now(),
        ]);
        $this->mock(
            ShopifyCustomerIdentityService::class,
            fn (MockInterface $mock) => $mock->shouldReceive('sync')->once()->andReturn($customer),
        );
        $handoff = Crypt::encryptString(json_encode([
            'shop' => $this->store->storefront_key,
            'shopify_customer_id' => '123456789',
            'name' => 'Shopify Buyer',
            'email' => 'buyer@example.com',
            'request_id' => $productionRequest->public_id,
        ], JSON_THROW_ON_ERROR));
        $url = URL::temporarySignedRoute(
            'shopify.customer.session',
            now()->addMinute(),
            compact('handoff'),
            absolute: false,
        );

        $this->get($url)->assertRedirect(route('store.customer.requests.show', [
            'store' => $this->store->storefront_key,
            'id' => $productionRequest->public_id,
        ]));
        $this->assertAuthenticatedAs($customer, 'customer');
    }

    public function test_shopify_profile_is_upserted_and_existing_email_account_is_linked(): void
    {
        $existing = Customer::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Old Name',
            'email' => 'buyer@example.com',
            'password' => 'old-local-password',
            'auth_provider' => 'local',
        ]);
        $synced = app(ShopifyCustomerIdentityService::class)->sync(
            $this->store,
            '123456789',
            [
                'name' => 'Shopify Buyer',
                'email' => 'buyer@example.com',
                'verified_email' => true,
            ],
        );

        $this->assertTrue($synced->is($existing));
        $this->assertSame('Shopify Buyer', $synced->name);
        $this->assertSame('shopify', $synced->auth_provider);
        $this->assertSame('abc-store.myshopify.com:123456789', $synced->provider_subject);
        $this->assertSame('gid://shopify/Customer/123456789', $synced->shopify_customer_gid);
        $this->assertNotNull($synced->email_verified_at);
        $this->assertDatabaseCount('customers', 1);
    }

    private function proxyUrl(
        string $shopifyCustomerId,
        string $path = '',
        string $customerEmail = 'buyer@example.com',
    ): string {
        $parameters = [
            'customer_email' => $shopifyCustomerId !== '' ? $customerEmail : '',
            'customer_name' => $shopifyCustomerId !== '' ? 'Shopify Buyer' : '',
            'logged_in_customer_id' => $shopifyCustomerId,
            'path_prefix' => '/apps/configurator',
            'shop' => $this->store->name,
            'timestamp' => (string) time(),
        ];
        ksort($parameters);
        $message = collect($parameters)
            ->map(fn (string $value, string $key): string => $key.'='.$value)
            ->implode('');
        $parameters['signature'] = hash_hmac(
            'sha256',
            $message,
            (string) config('shopify-app.api_secret'),
        );

        return '/shopify/app-proxy/configurator'.$path.'?'.http_build_query($parameters);
    }
}
