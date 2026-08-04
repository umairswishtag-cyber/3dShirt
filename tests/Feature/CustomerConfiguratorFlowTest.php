<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\CustomerDesign;
use App\Models\DesignCartItem;
use App\Models\Products\Product;
use App\Models\User;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerConfiguratorFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = User::factory()->create([
            'name' => 'abc-store.myshopify.com',
            'storefront_key' => 'abc-store.myshopify.com',
        ]);
        $this->withSession([StorefrontContext::SESSION_KEY => $this->store->id]);
    }

    public function test_storefront_root_uses_customer_entry_routes(): void
    {
        $this->get('/')->assertRedirect(route('store.customer.login', ['store' => $this->store->storefront_key]));
        $this->get('/login')->assertOk()->assertInertia(
            fn ($page) => $page->component('Customer/Auth/Login'),
        );
        $this->get('/register')->assertOk()->assertInertia(
            fn ($page) => $page->component('Customer/Auth/Register'),
        );
    }

    public function test_signed_in_customer_root_opens_the_customer_dashboard(): void
    {
        $this->actingAs($this->customer('dashboard@example.com'), 'customer');

        $this->get('/')->assertRedirect(route('store.customer.dashboard', ['store' => $this->store->storefront_key]));
    }

    public function test_customer_dashboard_receives_the_published_catalog_for_on_demand_previews(): void
    {
        $this->actingAs($this->customer('preview-dashboard@example.com'), 'customer');
        ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Preview Shirt',
            'slug' => 'preview-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/preview-shirt.glb',
            'is_published' => true,
        ]);

        $this->get(route('store.customer.dashboard', ['store' => $this->store->storefront_key]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Customer/Dashboard')
                ->where('catalog.0.id', 'preview-shirt')
                ->where('catalog.0.name', 'Preview Shirt'));
    }

    public function test_guest_must_sign_in_before_opening_configurator(): void
    {
        $response = $this->get('/configurator');

        $response->assertRedirect(route('store.customer.login', ['store' => $this->store->storefront_key]));
        $this->assertStringEndsWith('/configurator', session('url.intended'));
    }

    public function test_customer_can_register_through_graphql_and_open_configurator(): void
    {
        $response = $this->graphQL(<<<'GRAPHQL'
            mutation Register($input: CustomerRegisterInput!) {
                customerRegister(input: $input) { customer { id name email } message }
            }
        GRAPHQL, [
            'input' => [
                'name' => 'Jamie Customer',
                'email' => 'jamie@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ],
        ]);

        $response->assertOk()->assertJsonPath('data.customerRegister.customer.email', 'jamie@example.com');
        $this->assertAuthenticated('customer');
        $this->get('/configurator')->assertOk();
    }

    public function test_customer_can_save_list_load_finalize_and_delete_own_design(): void
    {
        $customer = $this->customer('owner@example.com');
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Everyday Shirt',
            'slug' => 'everyday-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/shirt.glb',
            'color_zones' => [['id' => 'body', 'label' => 'Body']],
            'is_published' => true,
        ]);
        $this->actingAs($customer, 'customer');
        $document = json_encode([
            'schemaVersion' => 1,
            'productId' => 'everyday-shirt',
            'shirtColors' => ['body' => '#FFFFFF'],
            'designObjects' => [],
        ], JSON_THROW_ON_ERROR);

        $saved = $this->graphQL(<<<'GRAPHQL'
            mutation Save($input: SaveCustomerDesignInput!) {
                saveMyDesign(input: $input) { id title status productId document }
            }
        GRAPHQL, ['input' => [
            'title' => 'Summer team shirt',
            'status' => 'DRAFT',
            'productId' => $product->slug,
            'productName' => $product->name,
            'document' => $document,
        ]])->assertOk()->assertJsonPath('data.saveMyDesign.status', 'DRAFT');

        $designId = $saved->json('data.saveMyDesign.id');
        $this->graphQL('query { myDesigns { id title status } }')
            ->assertOk()
            ->assertJsonCount(1, 'data.myDesigns')
            ->assertJsonPath('data.myDesigns.0.id', $designId);
        $this->graphQL('query Design($id: ID!) { myDesign(id: $id) { id document } }', ['id' => $designId])
            ->assertOk()
            ->assertJsonPath('data.myDesign.id', $designId);

        $this->graphQL(<<<'GRAPHQL'
            mutation Finish($input: SaveCustomerDesignInput!) {
                saveMyDesign(input: $input) { id status finalizedAt }
            }
        GRAPHQL, ['input' => [
            'id' => $designId,
            'title' => 'Summer team shirt',
            'status' => 'FINAL',
            'productId' => $product->slug,
            'productName' => $product->name,
            'document' => $document,
        ]])->assertOk()->assertJsonPath('data.saveMyDesign.status', 'FINAL');

        $this->assertNotNull(CustomerDesign::query()->firstOrFail()->finalized_at);
        $this->graphQL(<<<'GRAPHQL'
            mutation Rename($input: SaveCustomerDesignInput!) {
                saveMyDesign(input: $input) { id title status }
            }
        GRAPHQL, ['input' => [
            'id' => $designId,
            'title' => 'Renamed finished shirt',
            'status' => 'FINAL',
            'productId' => $product->slug,
            'productName' => $product->name,
            'document' => $document,
        ]])
            ->assertOk()
            ->assertJsonPath('data.saveMyDesign.title', 'Renamed finished shirt');
        $this->assertDatabaseHas('customer_designs', [
            'public_id' => $designId,
            'title' => 'Renamed finished shirt',
        ]);
        $this->graphQL('mutation Delete($id: ID!) { deleteMyDesign(id: $id) }', ['id' => $designId])
            ->assertOk()
            ->assertJsonPath('data.deleteMyDesign', true);
        $this->assertDatabaseCount('customer_designs', 0);
    }

    public function test_customer_logo_is_stored_as_an_asset_before_the_design_document_is_saved(): void
    {
        Storage::fake('public');
        $this->actingAs($this->customer('logo-owner@example.com'), 'customer');
        ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Cap',
            'slug' => 'cap',
            'gender' => 'unisex',
            'category' => 'caps',
            'model_url' => '/models/cap.glb',
            'is_published' => true,
        ]);
        $png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

        $response = $this->graphQL(<<<'GRAPHQL'
            mutation StoreLogo($input: StoreCustomerDesignAssetInput!) {
                storeMyDesignAsset(input: $input) { url }
            }
        GRAPHQL, ['input' => ['name' => 'logo.png', 'dataUrl' => $png]])
            ->assertOk()
            ->assertJsonMissingPath('errors');

        $url = $response->json('data.storeMyDesignAsset.url');
        $this->assertStringStartsWith('/storage/customer-designs/', $url);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $url));

        $document = json_encode([
            'schemaVersion' => 1,
            'productId' => 'cap',
            'shirtColors' => ['body' => '#FFFFFF'],
            'designObjects' => [['id' => 'logo-1', 'type' => 'image', 'source' => $url]],
        ], JSON_THROW_ON_ERROR);
        $this->graphQL(<<<'GRAPHQL'
            mutation Save($input: SaveCustomerDesignInput!) {
                saveMyDesign(input: $input) { id document }
            }
        GRAPHQL, ['input' => [
            'title' => 'Logo cap',
            'status' => 'DRAFT',
            'productId' => 'cap',
            'productName' => 'Cap',
            'document' => $document,
        ]])->assertOk()->assertJsonPath('data.saveMyDesign.document', $document);
    }

    public function test_customer_can_store_a_sanitized_svg_logo(): void
    {
        Storage::fake('public');
        $this->actingAs($this->customer('svg-logo-owner@example.com'), 'customer');
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert(1)"><script>alert(1)</script><defs><linearGradient id="logo-gradient"><stop stop-color="#2563eb"/></linearGradient></defs><rect width="100" height="100" fill="url(&quot;#logo-gradient&quot;)"/></svg>';

        $response = $this->graphQL(<<<'GRAPHQL'
            mutation StoreLogo($input: StoreCustomerDesignAssetInput!) {
                storeMyDesignAsset(input: $input) { url }
            }
        GRAPHQL, ['input' => [
            'name' => 'sharp-logo.svg',
            'dataUrl' => 'data:image/svg+xml;base64,'.base64_encode($svg),
        ]])->assertOk()->assertJsonMissingPath('errors');

        $url = $response->json('data.storeMyDesignAsset.url');
        $this->assertStringEndsWith('.svg', $url);
        $stored = Storage::disk('public')->get(str_replace('/storage/', '', $url));
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('onload=', $stored);
        $this->assertStringContainsString('<rect', $stored);
        $this->assertStringContainsString('url(&quot;#logo-gradient&quot;)', $stored);
    }

    public function test_customer_cannot_load_or_update_another_customers_design(): void
    {
        $owner = $this->customer('owner@example.com');
        $intruder = $this->customer('other@example.com');
        $design = CustomerDesign::query()->create([
            'customer_id' => $owner->id,
            'product_slug' => 'shirt',
            'product_name' => 'Shirt',
            'title' => 'Private design',
            'status' => 'draft',
            'document' => '{}',
        ]);
        $this->actingAs($intruder, 'customer');

        $this->graphQL('query Design($id: ID!) { myDesign(id: $id) { id } }', ['id' => $design->public_id])
            ->assertOk()
            ->assertJsonMissingPath('data.myDesign.id')
            ->assertJsonStructure(['errors']);
    }

    public function test_final_design_can_prepare_an_immutable_shopify_cart_item(): void
    {
        $customer = $this->customer('cart-owner@example.com');
        $shopifyProduct = Product::query()->create([
            'user_id' => $this->store->id,
            'shopify_product_id' => 987654321,
            'title' => 'Shopify Team Shirt',
            'status' => 'active',
        ]);
        $variant = $shopifyProduct->productVarients()->create([
            'shopify_product_varient_id' => 123456789,
            'title' => 'Large',
            'sku' => 'TEAM-L',
            'price' => 25,
            'inventory_quantity' => 10,
        ]);
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $this->store->id,
            'shopify_product_id' => $shopifyProduct->shopify_product_id,
            'name' => 'Team Shirt',
            'slug' => 'team-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/team-shirt.glb',
            'color_zones' => [['id' => 'body', 'label' => 'Body']],
            'is_published' => true,
        ]);
        $document = [
            'schemaVersion' => 1,
            'productId' => $product->slug,
            'shirtColors' => ['body' => '#2563EB'],
            'selectedPatternId' => null,
            'patternColors' => [],
            'patternZones' => [],
            'designObjects' => [[
                'id' => 'logo-1',
                'type' => 'image',
                'name' => 'Team logo',
                'areaId' => 'front',
                'source' => '/storage/customer-designs/logo.png',
                'x' => 0.5,
                'y' => 0.5,
            ]],
        ];
        $design = CustomerDesign::query()->create([
            'customer_id' => $customer->id,
            'configurator_product_id' => $product->id,
            'product_slug' => $product->slug,
            'product_name' => $product->name,
            'title' => 'Blue team shirt',
            'status' => 'draft',
            'document' => json_encode($document, JSON_THROW_ON_ERROR),
        ]);
        $this->actingAs($customer, 'customer');

        $this->graphQL(<<<'GRAPHQL'
            mutation PrepareDraft($input: PrepareDesignCartItemInput!) {
                prepareDesignCartItem(input: $input) { id }
            }
        GRAPHQL, ['input' => [
            'designId' => $design->public_id,
            'variantId' => (string) $variant->shopify_product_varient_id,
            'quantity' => 2,
        ]])
            ->assertOk()
            ->assertJsonStructure(['errors'])
            ->assertJsonFragment(['message' => 'Publish the design before requesting a quotation.']);

        $design->update(['status' => 'final', 'finalized_at' => now()]);

        $response = $this->graphQL(<<<'GRAPHQL'
            mutation Prepare($input: PrepareDesignCartItemInput!) {
                prepareDesignCartItem(input: $input) {
                    id
                    variantId
                    quantity
                    uploadUrl
                    requestUrl
                    properties { key value }
                }
            }
        GRAPHQL, ['input' => [
            'designId' => $design->public_id,
            'variantId' => (string) $variant->shopify_product_varient_id,
            'quantity' => 2,
        ]])->assertOk()->assertJsonMissingPath('errors');

        $jobId = $response->json('data.prepareDesignCartItem.id');
        $this->assertSame('123456789', $response->json('data.prepareDesignCartItem.variantId'));
        $this->assertSame(2, $response->json('data.prepareDesignCartItem.quantity'));
        $this->assertStringEndsWith($jobId, $response->json('data.prepareDesignCartItem.uploadUrl'));
        $this->assertSame('/apps/configurator?request_id='.$jobId, $response->json('data.prepareDesignCartItem.requestUrl'));
        $this->assertDatabaseHas('design_cart_items', [
            'public_id' => $jobId,
            'customer_design_id' => $design->id,
            'shopify_variant_id' => $variant->shopify_product_varient_id,
            'status' => 'prepared',
        ]);

        $job = DesignCartItem::query()->where('public_id', $jobId)->firstOrFail();
        $this->assertSame('FINAL', $job->snapshot['design']['status']);
        $this->assertSame($document, $job->snapshot['design']['document']);
        $this->assertSame('Body: #2563EB', $job->summary['colors']);
        $this->assertSame('1 logo (front)', $job->summary['artwork']);
        $this->assertSame(
            hash('sha256', json_encode($job->snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
            $job->snapshot_sha256,
        );
    }

    private function customer(string $email): Customer
    {
        return Customer::query()->create([
            'user_id' => $this->store->id,
            'name' => 'Test Customer',
            'email' => $email,
            'password' => 'password123',
        ]);
    }

    /** @param array<string, mixed> $variables */
    private function graphQL(string $query, array $variables = []): \Illuminate\Testing\TestResponse
    {
        return $this->withHeaders([
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->postJson('/graphql', compact('query', 'variables'));
    }
}
