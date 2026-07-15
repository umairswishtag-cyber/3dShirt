<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\CustomerDesign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerConfiguratorFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_storefront_root_uses_customer_entry_routes(): void
    {
        $this->get('/')->assertRedirect('/login');
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

        $this->get('/')->assertRedirect('/account');
    }

    public function test_guest_must_sign_in_before_opening_configurator(): void
    {
        $response = $this->get('/configurator');

        $response->assertRedirect('/login');
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
        $this->graphQL('mutation Delete($id: ID!) { deleteMyDesign(id: $id) }', ['id' => $designId])
            ->assertOk()
            ->assertJsonPath('data.deleteMyDesign', true);
        $this->assertDatabaseCount('customer_designs', 0);
    }

    public function test_customer_logo_is_stored_as_an_asset_before_the_design_document_is_saved(): void
    {
        Storage::fake('public');
        $this->actingAs($this->customer('logo-owner@example.com'), 'customer');
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

    private function customer(string $email): Customer
    {
        return Customer::query()->create([
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
