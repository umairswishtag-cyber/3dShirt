<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\Orders\Order;
use App\Models\User;
use App\Repositories\Product\ProductRepositoryInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class MultiStoreIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_storefront_catalog_contains_only_its_owners_products(): void
    {
        [$abc, $xyz] = $this->stores();
        $this->product($abc, 'custom-shirt', 'ABC Shirt');
        $this->product($xyz, 'custom-shirt', 'XYZ Shirt');

        $this->getJson(route('store.configurator.catalog', ['store' => $abc->storefront_key]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 'custom-shirt')
            ->assertJsonPath('data.0.name', 'ABC Shirt');

        $this->getJson(route('store.configurator.catalog', ['store' => $xyz->storefront_key]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 'custom-shirt')
            ->assertJsonPath('data.0.name', 'XYZ Shirt');
    }

    public function test_store_admin_sees_only_own_products_and_registered_customers(): void
    {
        [$abc, $xyz] = $this->stores();
        $this->product($abc, 'abc-shirt', 'ABC Shirt');
        $this->product($xyz, 'xyz-shirt', 'XYZ Shirt');
        $this->customer($abc, 'shared@example.com', 'ABC Customer');
        $this->customer($xyz, 'shared@example.com', 'XYZ Customer');

        $this->actingAs($abc)
            ->get(route('admin.configurator.products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('products', 1)
                ->where('products.0.slug', 'abc-shirt')
            );

        $this->get(route('admin.customers.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('platformView', false)
                ->has('customers.data', 1)
                ->where('customers.data.0.name', 'ABC Customer')
            );
    }

    public function test_same_email_can_register_independently_at_two_stores(): void
    {
        [$abc, $xyz] = $this->stores();

        $this->get(route('store.customer.register', ['store' => $abc->storefront_key, 'local' => 1]))->assertOk();
        $this->registerCustomer('Shared Person', 'shared@example.com')->assertOk()
            ->assertJsonPath('data.customerRegister.customer.email', 'shared@example.com');

        Auth::guard('customer')->logout();
        $this->get(route('store.customer.register', ['store' => $xyz->storefront_key, 'local' => 1]))->assertOk();
        $this->registerCustomer('Shared Person', 'shared@example.com')->assertOk()
            ->assertJsonPath('data.customerRegister.customer.email', 'shared@example.com');

        $this->assertDatabaseHas('customers', ['user_id' => $abc->id, 'email' => 'shared@example.com']);
        $this->assertDatabaseHas('customers', ['user_id' => $xyz->id, 'email' => 'shared@example.com']);
        $this->assertDatabaseCount('customers', 2);
    }

    public function test_customer_cannot_save_a_design_for_another_stores_product(): void
    {
        [$abc, $xyz] = $this->stores();
        $foreignProduct = $this->product($xyz, 'xyz-shirt', 'XYZ Shirt');
        $customer = $this->customer($abc, 'abc@example.com', 'ABC Customer');

        $this->get(route('store.customer.login', ['store' => $abc->storefront_key, 'local' => 1]));
        $this->actingAs($customer, 'customer');

        $document = json_encode([
            'schemaVersion' => 1,
            'productId' => $foreignProduct->slug,
            'shirtColors' => [],
            'designObjects' => [],
        ], JSON_THROW_ON_ERROR);

        $this->graphQL(<<<'GRAPHQL'
            mutation Save($input: SaveCustomerDesignInput!) {
                saveMyDesign(input: $input) { id }
            }
        GRAPHQL, ['input' => [
            'title' => 'Foreign design',
            'status' => 'DRAFT',
            'productId' => $foreignProduct->slug,
            'productName' => $foreignProduct->name,
            'document' => $document,
        ]])->assertOk()
            ->assertJsonMissingPath('data.saveMyDesign.id')
            ->assertJsonStructure(['errors']);

        $this->assertDatabaseCount('customer_designs', 0);
    }

    public function test_shopify_order_search_cannot_escape_the_authenticated_store(): void
    {
        [$abc, $xyz] = $this->stores();
        Order::query()->create(['user_id' => $abc->id, 'shopify_order_id' => 100, 'name' => '#ABC-100']);
        Order::query()->create(['user_id' => $xyz->id, 'shopify_order_id' => 200, 'name' => '#PRIVATE-XYZ']);

        $this->actingAs($abc)
            ->getJson(route('search', ['query' => 'PRIVATE-XYZ']))
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_synced_shopify_product_identity_is_composite_by_store(): void
    {
        [$abc, $xyz] = $this->stores();
        $repository = app(ProductRepositoryInterface::class);
        $base = [
            'shopify_product_id' => 12345,
            'title' => 'Shared Shopify numeric ID',
            'variants' => [],
            'media' => [],
        ];

        $repository->updateOrCreate([...$base, 'user_id' => $abc->id]);
        $repository->updateOrCreate([...$base, 'user_id' => $xyz->id]);

        $this->assertDatabaseCount('products', 2);
        $this->assertDatabaseHas('products', ['user_id' => $abc->id, 'shopify_product_id' => 12345]);
        $this->assertDatabaseHas('products', ['user_id' => $xyz->id, 'shopify_product_id' => 12345]);
    }

    /** @return array{User, User} */
    private function stores(): array
    {
        return [
            User::factory()->create([
                'name' => 'abc-store.myshopify.com',
                'storefront_key' => 'abc-store.myshopify.com',
            ]),
            User::factory()->create([
                'name' => 'xyz-store.myshopify.com',
                'storefront_key' => 'xyz-store.myshopify.com',
            ]),
        ];
    }

    private function product(User $store, string $slug, string $name): ConfiguratorProduct
    {
        return ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => $name,
            'slug' => $slug,
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => "/models/{$slug}.glb",
            'color_zones' => [['id' => 'body', 'label' => 'Body']],
            'is_published' => true,
        ]);
    }

    private function customer(User $store, string $email, string $name): Customer
    {
        return Customer::query()->create([
            'user_id' => $store->id,
            'name' => $name,
            'email' => $email,
            'password' => 'password123',
        ]);
    }

    private function registerCustomer(string $name, string $email): \Illuminate\Testing\TestResponse
    {
        return $this->graphQL(<<<'GRAPHQL'
            mutation Register($input: CustomerRegisterInput!) {
                customerRegister(input: $input) { customer { id email } }
            }
        GRAPHQL, ['input' => [
            'name' => $name,
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]]);
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
