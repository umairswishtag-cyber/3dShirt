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
            ->has('catalog')
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
