<?php

namespace Tests\Feature;

use App\Http\Traits\ShopifyOrderTrait;
use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\CustomerDesign;
use App\Models\DesignCartItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DesignOrderCorrelationTest extends TestCase
{
    use RefreshDatabase;

    public function test_shopify_order_line_properties_link_the_private_production_job(): void
    {
        $store = User::factory()->create(['name' => 'print-store.myshopify.com']);
        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => 'Print Buyer',
            'email' => 'print@example.com',
        ]);
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => 'Print Shirt',
            'slug' => 'print-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'model_url' => '/models/print-shirt.glb',
            'is_published' => true,
        ]);
        $design = CustomerDesign::query()->create([
            'customer_id' => $customer->id,
            'configurator_product_id' => $product->id,
            'product_slug' => $product->slug,
            'product_name' => $product->name,
            'title' => 'Print design',
            'status' => 'final',
            'document' => '{}',
            'finalized_at' => now(),
        ]);
        $job = DesignCartItem::query()->create([
            'customer_id' => $customer->id,
            'customer_design_id' => $design->id,
            'configurator_product_id' => $product->id,
            'shopify_product_id' => 123,
            'shopify_variant_id' => 456,
            'quantity' => 2,
            'status' => 'ready',
            'snapshot_sha256' => str_repeat('b', 64),
            'snapshot' => ['schemaVersion' => 1],
            'summary' => ['design' => 'Print design'],
            'final_model_path' => 'production-jobs/model.glb',
            'assets_uploaded_at' => now(),
        ]);
        $line = (object) [
            'id' => 999,
            'price' => '25.00',
            'quantity' => 2,
            'sku' => 'PRINT-L',
            'title' => 'Print Shirt - Large',
            'total_discount' => '0.00',
            'variant_id' => 456,
            'properties' => [
                (object) ['name' => 'Design', 'value' => 'Print design'],
                (object) ['name' => '_3d_job_id', 'value' => $job->public_id],
            ],
        ];
        $formatter = new class
        {
            use ShopifyOrderTrait;
        };

        $formatted = $formatter->formatOrderLineItemsData([$line], $store);

        $this->assertSame($job->id, $formatted[0]['design_cart_item_id']);
        $this->assertSame($job->public_id, $formatted[0]['customization_properties']['_3d_job_id']);
        $this->assertSame('ordered', $job->refresh()->status);
        $this->assertNotNull($job->ordered_at);

        $job->update(['status' => 'payment_pending', 'payment_status' => 'pending']);
        $formatter->formatOrderLineItemsData([$line], $store, 'PAID', 'gid://shopify/Order/123456');
        $this->assertSame('paid', $job->refresh()->status);
        $this->assertSame('paid', $job->payment_status);
        $this->assertSame(123456, $job->shopify_order_id);
        $this->assertDatabaseHas('production_request_events', [
            'design_cart_item_id' => $job->id,
            'event' => 'shopify_payment_cleared',
        ]);
    }
}
