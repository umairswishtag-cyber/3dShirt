<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DesignCartItem;
use App\Models\User;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductionRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_quotes_customer_approves_and_admin_controls_payment_and_production(): void
    {
        [$store, $customer, $item] = $this->request();

        $this->actingAs($store)->post(route('admin.production-requests.quote', $item->public_id), [
            'unit_price' => 42.50,
            'shipping' => 10,
            'tax' => 5,
            'discount' => 2,
            'currency' => 'usd',
            'notes' => 'Includes technical review and one proof revision.',
        ])->assertRedirect();

        $item->refresh();
        $this->assertSame('quoted', $item->status);
        $this->assertSame('140.50', $item->quote_total);
        $this->assertDatabaseHas('production_request_events', ['design_cart_item_id' => $item->id, 'event' => 'quote_sent']);

        $this->withSession([StorefrontContext::SESSION_KEY => $store->id])
            ->actingAs($customer, 'customer')
            ->post(route('store.customer.requests.respond', ['store' => $store->storefront_key, 'id' => $item->public_id]), [
                'action' => 'approve_quote',
            ])->assertRedirect();
        $this->assertSame('quote_approved', $item->refresh()->status);

        $this->actingAs($store)->post(route('admin.production-requests.action', $item->public_id), [
            'action' => 'mark_paid', 'payment_reference' => 'BANK-123',
        ])->assertRedirect();
        $this->assertDatabaseHas('design_cart_items', ['id' => $item->id, 'status' => 'paid', 'payment_status' => 'paid', 'payment_reference' => 'BANK-123']);

        $this->actingAs($store)->post(route('admin.production-requests.action', $item->public_id), ['action' => 'proof_review'])->assertRedirect();
        $this->withSession([StorefrontContext::SESSION_KEY => $store->id])
            ->actingAs($customer, 'customer')
            ->post(route('store.customer.requests.respond', ['store' => $store->storefront_key, 'id' => $item->public_id]), ['action' => 'approve_proof'])
            ->assertRedirect();

        foreach (['start_printing', 'complete'] as $action) {
            $this->actingAs($store)->post(route('admin.production-requests.action', $item->public_id), compact('action'))->assertRedirect();
        }
        $this->assertSame('completed', $item->refresh()->status);
        $this->assertNotNull($item->completed_at);
    }

    public function test_store_and_customer_cannot_open_another_stores_request(): void
    {
        [$store, $customer, $item] = $this->request();
        $other = User::factory()->create(['name' => 'other.myshopify.com', 'storefront_key' => 'other.myshopify.com']);
        $otherCustomer = Customer::query()->create(['user_id' => $other->id, 'name' => 'Other', 'email' => 'other@example.com', 'password' => 'password123']);

        $this->actingAs($other)->get(route('admin.production-requests.show', $item->public_id))->assertNotFound();
        $this->withSession([StorefrontContext::SESSION_KEY => $store->id])
            ->actingAs($otherCustomer, 'customer')
            ->get(route('store.customer.requests.show', ['store' => $store->storefront_key, 'id' => $item->public_id]))
            ->assertRedirect();
    }

    public function test_admin_request_exposes_the_frozen_final_glb_for_preview_and_download(): void
    {
        Storage::fake('local');
        [$store, $customer, $item] = $this->request();
        $path = 'production-requests/'.$item->public_id.'/final.glb';
        Storage::disk('local')->put($path, 'binary-glb');
        $item->update([
            'final_model_path' => $path,
            'snapshot' => [
                'schemaVersion' => 1,
                'design' => ['status' => 'FINAL', 'finalizedAt' => now()->toIso8601String()],
                'product' => ['name' => 'Team Shirt'],
            ],
        ]);

        $modelUrl = route('admin.production-jobs.model', ['id' => $item->public_id]);
        $this->actingAs($store)
            ->get(route('admin.production-requests.show', ['id' => $item->public_id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/ProductionRequests/Show')
                ->where('productionRequest.designStatus', 'FINAL')
                ->where('productionRequest.finalModelUrl', $modelUrl));

        $this->actingAs($store)
            ->get($modelUrl)
            ->assertOk()
            ->assertHeader('content-type', 'model/gltf-binary');
    }

    /** @return array{User, Customer, DesignCartItem} */
    private function request(): array
    {
        $store = User::factory()->create(['name' => 'requests.myshopify.com', 'storefront_key' => 'requests.myshopify.com']);
        $customer = Customer::query()->create(['user_id' => $store->id, 'name' => 'Jamie', 'email' => 'jamie@example.com', 'password' => 'password123']);
        $item = DesignCartItem::query()->create([
            'customer_id' => $customer->id,
            'shopify_product_id' => 100,
            'shopify_variant_id' => 200,
            'quantity' => 3,
            'status' => 'under_review',
            'snapshot_sha256' => str_repeat('a', 64),
            'snapshot' => ['product' => ['name' => 'Team Shirt']],
            'summary' => ['design' => 'Blue Team Shirt', 'colors' => 'Blue', 'pattern' => 'None', 'artwork' => '1 logo'],
            'assets_uploaded_at' => now(),
            'requested_at' => now(),
        ]);

        return [$store, $customer, $item];
    }
}
