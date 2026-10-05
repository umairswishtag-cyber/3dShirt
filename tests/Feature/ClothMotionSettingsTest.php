<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\User;
use App\Services\Configurator\ConfiguratorCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClothMotionSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function motion(): array
    {
        return ['enabled' => true, 'upper' => 0.15, 'hem' => 0.9, 'sleeves' => 0.5,
            'hemHeight' => 0.45, 'damping' => 15, 'meshParts' => ['SleeveMesh' => 'sleeves']];
    }

    private function data(): array
    {
        return ['name' => 'Motion shirt', 'gender' => 'men', 'category' => 'shirts',
            'shopify_status' => 'draft', 'price' => '25.00', 'inventory_quantity' => 1,
            'fit_height' => 2.45, 'mesh_zones' => ['BodyMesh' => 'body'], 'print_areas' => [],
            'color_zones' => [['id' => 'body', 'label' => 'Body', 'defaultColor' => '#FFFFFF']],
            'allowed_colors' => ['#FFFFFF'], 'pattern_zones' => [], 'supports_colors' => true,
            'supports_patterns' => false, 'supports_logos' => false, 'is_published' => false, 'sort_order' => 0];
    }

    public function test_only_super_admin_can_grant_or_revoke_vendor_access(): void
    {
        $vendor = User::factory()->create();
        $admin = User::factory()->create(['is_platform_admin' => true]);
        $url = route('admin.configurator.motion.access', $vendor);
        $this->actingAs($vendor)->patch($url, ['can_configure_cloth_motion' => true])->assertForbidden();
        $this->actingAs($admin)->patch($url, ['can_configure_cloth_motion' => true])->assertSessionHasNoErrors();
        $this->assertTrue($vendor->fresh()->canConfigureClothMotion());
        $this->patch($url, ['can_configure_cloth_motion' => false])->assertSessionHasNoErrors();
        $this->assertFalse($vendor->fresh()->canConfigureClothMotion());
    }

    public function test_granted_vendor_can_save_regional_motion_on_a_shirt_and_catalog_uses_it(): void
    {
        Storage::fake('public');
        $vendor = User::factory()->create(['can_configure_cloth_motion' => true]);
        $this->actingAs($vendor)->post(route('admin.configurator.products.store'), [
            ...$this->data(), 'cloth_motion' => $this->motion(),
            'model' => UploadedFile::fake()->create('shirt.glb', 10, 'model/gltf-binary'),
        ])->assertSessionHasNoErrors();
        $product = ConfiguratorProduct::firstOrFail();
        $this->assertEquals($this->motion(), $product->cloth_motion);
        $catalog = app(ConfiguratorCatalogService::class)->storefrontProduct($product);
        $this->assertTrue($catalog['model']['dressMotion']['enabled']);
        $this->assertEquals(0.15, $catalog['model']['dressMotion']['upper']);
        $this->assertEquals('sleeves', $catalog['model']['dressMotion']['meshParts']['SleeveMesh']);
    }

    public function test_vendor_without_permission_cannot_submit_motion_but_can_save_other_fields(): void
    {
        $vendor = User::factory()->create();
        $product = ConfiguratorProduct::create([...$this->data(), 'slug' => 'motion-shirt',
            'user_id' => $vendor->id, 'model_url' => '/models/shirt.glb', 'cloth_motion' => $this->motion()]);
        $this->actingAs($vendor)->put(route('admin.configurator.products.update', $product), [
            ...$this->data(), 'cloth_motion' => $this->motion(),
        ])->assertSessionHasErrors('cloth_motion');
        $this->put(route('admin.configurator.products.update', $product), [
            ...$this->data(), 'name' => 'Updated shirt',
        ])->assertSessionHasNoErrors();
        $this->assertEquals($this->motion(), $product->fresh()->cloth_motion);
        $catalog = app(ConfiguratorCatalogService::class)->storefrontProduct($product->fresh());
        $this->assertFalse($catalog['model']['dressMotion']['enabled']);
        $this->assertEquals(0.9, $catalog['model']['dressMotion']['hem']);
    }

    public function test_motion_limits_and_invalid_mesh_roles_are_rejected(): void
    {
        $vendor = User::factory()->create(['can_configure_cloth_motion' => true]);
        $product = ConfiguratorProduct::create([...$this->data(), 'slug' => 'motion-shirt',
            'user_id' => $vendor->id, 'model_url' => '/models/shirt.glb']);
        $this->actingAs($vendor)->put(route('admin.configurator.products.update', $product), [
            ...$this->data(), 'cloth_motion' => [...$this->motion(), 'hem' => 50, 'damping' => 0,
                'meshParts' => ['BodyMesh' => 'invalid']],
        ])->assertSessionHasErrors(['cloth_motion.hem', 'cloth_motion.damping', 'cloth_motion.meshParts.BodyMesh']);
        $this->assertNull($product->fresh()->cloth_motion);
    }

    public function test_settings_are_store_scoped_and_form_exposes_permission(): void
    {
        $vendor = User::factory()->create(['can_configure_cloth_motion' => true]);
        $other = User::factory()->create();
        $own = ConfiguratorProduct::create([...$this->data(), 'slug' => 'own', 'user_id' => $vendor->id]);
        $foreign = ConfiguratorProduct::create([...$this->data(), 'slug' => 'other', 'user_id' => $other->id]);
        $this->actingAs($vendor)->get(route('admin.configurator.motion.index'))->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Configurator/ClothMotionSettings')
                ->where('canManageAccess', false)->where('canConfigureClothMotion', true)
                ->has('stores', 0)->has('products', 1)->where('products.0.id', $own->id));
        $this->get(route('admin.configurator.products.create'))->assertOk()
            ->assertInertia(fn ($page) => $page->where('canConfigureClothMotion', true));
        $this->put(route('admin.configurator.products.update', $foreign), $this->data())->assertNotFound();
    }
}
