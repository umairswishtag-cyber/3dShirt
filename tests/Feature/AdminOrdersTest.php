<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\DesignCartItem;
use App\Models\Orders\Order;
use App\Models\Orders\OrderCustomer;
use App\Models\Orders\OrderFulfillment;
use App\Models\Orders\OrderLineItem;
use App\Models\Orders\OrderShippingAddress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_admin_sees_only_own_orders_with_summary_and_filters(): void
    {
        $store = User::factory()->create(['name' => 'orders-a.myshopify.com']);
        $otherStore = User::factory()->create(['name' => 'orders-b.myshopify.com']);
        $paid = $this->order($store, 101, '#101', 'PAID', 'UNFULFILLED');
        $this->lineItem($paid, 2);
        $pending = $this->order($store, 102, '#102', 'PENDING', 'FULFILLED');
        $this->lineItem($pending, 1);
        $foreign = $this->order($otherStore, 201, '#PRIVATE', 'PAID', 'UNFULFILLED');
        $this->lineItem($foreign, 4);

        $this->actingAs($store)
            ->get(route('admin.orders.index', ['payment' => 'paid']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Orders/Index')
                ->where('platformView', false)
                ->where('summary.total', 2)
                ->where('summary.paid', 1)
                ->where('summary.needsFulfillment', 1)
                ->has('orders.data', 1)
                ->where('orders.data.0.name', '#101')
                ->where('orders.data.0.itemQuantity', 2)
            );
    }

    public function test_order_detail_contains_customer_shipping_fulfillment_and_production_assets(): void
    {
        $store = User::factory()->create(['name' => 'production-orders.myshopify.com']);
        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => 'Design Buyer',
            'email' => 'buyer@example.com',
        ]);
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => 'Custom Shirt',
            'slug' => 'custom-shirt',
            'gender' => 'unisex',
            'category' => 'shirts',
            'thumbnail_url' => 'https://example.com/shirt.png',
        ]);
        $job = DesignCartItem::query()->create([
            'customer_id' => $customer->id,
            'configurator_product_id' => $product->id,
            'shopify_product_id' => 500,
            'shopify_variant_id' => 501,
            'quantity' => 1,
            'status' => 'ordered',
            'snapshot_sha256' => str_repeat('a', 64),
            'snapshot' => ['schemaVersion' => 1],
            'summary' => ['design' => 'Blue logo shirt'],
            'final_model_path' => 'production-jobs/model.glb',
            'print_area_paths' => ['front' => 'production-jobs/front.png'],
            'logo_paths' => ['logo-1' => 'production-jobs/logo.svg'],
            'pattern_path' => 'production-jobs/pattern.svg',
            'assets_uploaded_at' => now(),
            'ordered_at' => now(),
        ]);
        $shopifyCustomer = OrderCustomer::query()->create([
            'shopify_customer_id' => '900',
            'first_name' => 'Design',
            'last_name' => 'Buyer',
            'email' => 'buyer@example.com',
        ]);
        $order = $this->order($store, 301, '#301', 'PAID', 'FULFILLED', $shopifyCustomer->id);
        OrderLineItem::query()->create([
            'order_id' => $order->id,
            'shopify_order_lineitem_id' => 700,
            'design_cart_item_id' => $job->id,
            'title' => 'Custom Shirt',
            'sku' => 'SHIRT-M',
            'quantity' => 1,
            'price' => 50,
            'total_discount' => 5,
            'customization_properties' => ['Design' => 'Blue logo shirt', '_3d_job_id' => $job->public_id],
        ]);
        OrderShippingAddress::query()->create([
            'order_id' => $order->id,
            'first_name' => 'Design',
            'last_name' => 'Buyer',
            'address1' => '1 Production Way',
            'city' => 'Lahore',
            'country' => 'Pakistan',
        ]);
        OrderFulfillment::query()->create([
            'order_id' => $order->id,
            'shopify_order_fulfillment_id' => 800,
            'status' => 'SUCCESS',
            'shipment_status' => 'DELIVERED',
            'tracking_company' => 'Test Carrier',
            'tracking_number' => 'TRACK-1',
            'tracking_url' => 'https://example.com/track/1',
        ]);

        $this->actingAs($store)
            ->get(route('admin.orders.show', $order))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Orders/Show')
                ->where('order.name', '#301')
                ->where('order.customer.name', 'Design Buyer')
                ->where('order.shippingAddress.city', 'Lahore')
                ->where('order.lineItems.0.production.id', $job->public_id)
                ->where('order.lineItems.0.production.assets.model', route('admin.production-jobs.model', $job->public_id))
                ->where('order.lineItems.0.lineTotal', 45)
                ->where('order.fulfillments.0.trackingNumber', 'TRACK-1')
            );
    }

    public function test_store_admin_cannot_open_another_stores_order_but_platform_admin_can(): void
    {
        $store = User::factory()->create(['name' => 'order-owner.myshopify.com']);
        $otherStore = User::factory()->create(['name' => 'order-other.myshopify.com']);
        $platform = User::factory()->create(['is_platform_admin' => true]);
        $order = $this->order($otherStore, 401, '#401');

        $this->actingAs($store)->get(route('admin.orders.show', $order))->assertNotFound();
        $this->actingAs($platform)->get(route('admin.orders.show', $order))->assertOk();
    }

    private function order(
        User $store,
        int $shopifyId,
        string $name,
        string $payment = 'PENDING',
        string $fulfillment = 'UNFULFILLED',
        ?int $customerId = null,
    ): Order {
        return Order::query()->create([
            'user_id' => $store->id,
            'shopify_order_id' => $shopifyId,
            'shopify_created_at' => now(),
            'order_customer_id' => $customerId,
            'name' => $name,
            'email' => 'buyer@example.com',
            'currency' => 'USD',
            'financial_status' => $payment,
            'fulfillment_status' => $fulfillment,
            'subtotal_price' => 50,
            'total_discounts' => 5,
            'total_shipping_price' => 4,
            'total_tax' => 3,
            'total_price' => 52,
            'total_outstanding' => $payment === 'PAID' ? 0 : 52,
        ]);
    }

    private function lineItem(Order $order, int $quantity): OrderLineItem
    {
        return OrderLineItem::query()->create([
            'order_id' => $order->id,
            'shopify_order_lineitem_id' => $order->shopify_order_id * 10,
            'title' => 'Shirt',
            'quantity' => $quantity,
            'price' => 25,
            'total_discount' => 0,
        ]);
    }
}
