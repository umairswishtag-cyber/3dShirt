<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfiguratorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_configurator_page_is_available(): void
    {
        $store = User::factory()->create([
            'name' => 'page-store.myshopify.com',
            'storefront_key' => 'page-store.myshopify.com',
        ]);
        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => 'Test Customer',
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($customer, 'customer');
        $response = $this->get(route('store.configurator', ['store' => $store->storefront_key]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Configurator/ConfiguratorPage')
            ->where('initialProductId', null)
            ->has('catalog')
        );
    }

    public function test_new_design_opens_the_only_published_product_directly(): void
    {
        $store = User::factory()->create([
            'name' => 'single-product-store.myshopify.com',
            'storefront_key' => 'single-product-store.myshopify.com',
        ]);
        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => 'Single Product Customer',
            'email' => 'single-product@example.com',
            'password' => 'password123',
        ]);
        ConfiguratorProduct::query()->create([
            'user_id' => $store->id,
            'name' => 'Only Cap',
            'slug' => 'only-cap',
            'gender' => 'unisex',
            'category' => 'caps',
            'model_url' => '/models/only-cap.glb',
            'is_published' => true,
        ]);

        $this->actingAs($customer, 'customer')
            ->get(route('store.configurator', ['store' => $store->storefront_key]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Configurator/ConfiguratorPage')
                ->has('catalog', 1)
                ->where('initialProductId', 'only-cap')
            );
    }

    public function test_new_design_keeps_the_product_chooser_when_multiple_products_are_published(): void
    {
        $store = User::factory()->create([
            'name' => 'multiple-product-store.myshopify.com',
            'storefront_key' => 'multiple-product-store.myshopify.com',
        ]);
        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => 'Multiple Product Customer',
            'email' => 'multiple-products@example.com',
            'password' => 'password123',
        ]);
        foreach (['first-cap', 'second-cap'] as $slug) {
            ConfiguratorProduct::query()->create([
                'user_id' => $store->id,
                'name' => str($slug)->headline()->toString(),
                'slug' => $slug,
                'gender' => 'unisex',
                'category' => 'caps',
                'model_url' => "/models/{$slug}.glb",
                'is_published' => true,
            ]);
        }

        $this->actingAs($customer, 'customer')
            ->get(route('store.configurator', ['store' => $store->storefront_key]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Configurator/ConfiguratorPage')
                ->has('catalog', 2)
                ->where('initialProductId', null)
            );
    }

    public function test_admin_can_preview_the_storefront_without_a_customer_login(): void
    {
        $admin = User::factory()->create();
        $product = ConfiguratorProduct::query()->create([
            'user_id' => $admin->id,
            'name' => 'Preview Shirt',
            'slug' => 'preview-shirt',
            'gender' => 'men',
            'category' => 'shirts',
            'model_url' => '/models/preview.glb',
            'color_zones' => [['id' => 'body', 'label' => 'Body']],
            'is_published' => true,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.configurator.preview', $product))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Configurator/ConfiguratorPage')
                ->where('adminPreview', true)
                ->where('initialProductId', 'preview-shirt')
                ->has('catalog', 1)
            );

        $this->assertGuest('customer');
    }

    public function test_admin_storefront_preview_still_requires_admin_authentication(): void
    {
        $this->get(route('admin.configurator.preview'))
            ->assertRedirect('/admin/login');
    }
}
