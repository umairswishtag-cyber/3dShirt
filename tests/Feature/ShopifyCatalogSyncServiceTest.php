<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\User;
use App\Services\Configurator\ShopifyCatalogSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopifyCatalogSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_price_tracks_inventory_and_publishes_an_active_product(): void
    {
        $store = User::factory()->create(['name' => 'sync-test.myshopify.com']);
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => 'Custom Shirt',
            'slug' => 'custom-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'description' => 'A custom shirt.',
            'thumbnail_url' => 'https://example.com/custom-shirt.png',
            'shopify_status' => 'active',
            'price' => '29.95',
            'inventory_quantity' => 12,
            'tags' => ['custom', 'shirt'],
        ]);

        $service = new class extends ShopifyCatalogSyncService
        {
            public array $queries = [];

            protected function graph(User $store, string $query, array $variables = []): array
            {
                $this->queries[] = compact('query', 'variables');

                return match (true) {
                    str_contains($query, 'productCreate') => ['productCreate' => [
                        'product' => [
                            'id' => 'gid://shopify/Product/101',
                            'legacyResourceId' => '101',
                            'handle' => 'custom-shirt',
                            'status' => 'ACTIVE',
                            'tags' => ['custom', 'shirt'],
                            'media' => ['nodes' => [[
                                'id' => 'gid://shopify/MediaImage/707',
                                'mediaContentType' => 'IMAGE',
                                'status' => 'PROCESSING',
                            ]]],
                            'variants' => ['nodes' => [[
                                'id' => 'gid://shopify/ProductVariant/202',
                                'legacyResourceId' => '202',
                                'title' => 'Default Title',
                                'price' => '0.00',
                                'inventoryQuantity' => 0,
                                'inventoryItem' => [
                                    'id' => 'gid://shopify/InventoryItem/303',
                                    'legacyResourceId' => '303',
                                    'tracked' => true,
                                ],
                            ]]],
                        ],
                        'userErrors' => [],
                    ]],
                    str_contains($query, 'productVariantsBulkUpdate') => ['productVariantsBulkUpdate' => [
                        'productVariants' => [[
                            'id' => 'gid://shopify/ProductVariant/202',
                            'legacyResourceId' => '202',
                            'title' => 'Default Title',
                            'price' => '29.95',
                            'inventoryQuantity' => 12,
                            'inventoryItem' => [
                                'id' => 'gid://shopify/InventoryItem/303',
                                'legacyResourceId' => '303',
                                'tracked' => true,
                            ],
                        ]],
                        'userErrors' => [],
                    ]],
                    str_contains($query, 'productReorderMedia') => ['productReorderMedia' => [
                        'job' => ['id' => 'gid://shopify/Job/808'],
                        'mediaUserErrors' => [],
                    ]],
                    str_contains($query, 'ConfiguratorPrimaryLocation') => ['location' => [
                        'id' => 'gid://shopify/Location/404',
                        'name' => 'Primary',
                        'isActive' => true,
                    ]],
                    str_contains($query, 'ConfiguratorInventoryLevel') => ['inventoryItem' => ['inventoryLevel' => null]],
                    str_contains($query, 'inventoryActivate') => ['inventoryActivate' => [
                        'inventoryLevel' => ['id' => 'gid://shopify/InventoryLevel/505'],
                        'userErrors' => [],
                    ]],
                    str_contains($query, 'ConfiguratorPublications') => ['publications' => ['nodes' => [[
                        'id' => 'gid://shopify/Publication/606',
                        'catalog' => ['title' => 'Online Store'],
                        'channels' => ['nodes' => [['name' => 'Online Store']]],
                    ]]]],
                    str_contains($query, 'publishablePublish') => ['publishablePublish' => ['userErrors' => []]],
                    default => throw new \RuntimeException('Unexpected GraphQL operation.'),
                };
            }
        };

        $synced = $service->sync($product, $store);

        $this->assertSame(101, $synced->shopify_product_id);
        $this->assertSame(202, $synced->shopify_variant_id);
        $this->assertSame(303, $synced->shopify_inventory_item_id);
        $this->assertSame('gid://shopify/MediaImage/707', $synced->shopify_media_id);
        $this->assertSame('https://example.com/custom-shirt.png', $synced->shopify_thumbnail_synced_path);
        $this->assertNotNull($synced->shopify_synced_at);
        $this->assertDatabaseHas('products', [
            'user_id' => $store->id,
            'shopify_product_id' => 101,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('product_varients', [
            'shopify_product_varient_id' => 202,
            'shopify_inventory_item_id' => 303,
            'price' => 29.95,
            'inventory_quantity' => 12,
        ]);

        $queries = implode("\n", array_column($service->queries, 'query'));
        $this->assertStringContainsString('productCreate', $queries);
        $this->assertStringContainsString('productReorderMedia', $queries);
        $this->assertStringContainsString('productVariantsBulkUpdate', $queries);
        $this->assertStringContainsString('inventoryActivate', $queries);
        $this->assertStringContainsString('publishablePublish', $queries);
        $this->assertSame(
            'gid://shopify/TaxonomyCategory/aa-1',
            $service->queries[0]['variables']['product']['category'],
        );
        $this->assertSame(
            'https://example.com/custom-shirt.png',
            $service->queries[0]['variables']['media'][0]['originalSource'],
        );
        $reorder = collect($service->queries)->first(
            fn ($call) => str_contains($call['query'], 'productReorderMedia'),
        );
        $this->assertSame('gid://shopify/MediaImage/707', $reorder['variables']['moves'][0]['id']);
        $this->assertSame('0', $reorder['variables']['moves'][0]['newPosition']);
    }
}
