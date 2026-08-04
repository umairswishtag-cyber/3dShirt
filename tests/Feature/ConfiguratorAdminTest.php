<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\ConfiguratorTaxonomy;
use App\Models\User;
use App\Services\Configurator\ShopifyCatalogSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ConfiguratorAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_routes_require_authentication(): void
    {
        $this->get('/admin/configurator/products')->assertRedirect('/admin/login');
    }

    public function test_authenticated_user_lands_on_the_configurator_admin_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->where('canCreateProducts', true)
                ->where('summary.products', 0)
                ->has('recentProducts')
            );
    }

    public function test_platform_admin_never_receives_product_creation_actions(): void
    {
        $platformAdmin = User::factory()->create(['is_platform_admin' => true]);

        $this->actingAs($platformAdmin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Dashboard')
                ->where('canCreateProducts', false)
                ->where('createProductUrl', null)
            );

        $this->get(route('admin.configurator.products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Configurator/ProductsIndex')
                ->where('canCreateProducts', false)
                ->where('createProductUrl', null)
            );

        $this->get(route('admin.configurator.products.create'))->assertForbidden();
    }

    public function test_store_admin_product_creation_action_opens_the_new_product_form(): void
    {
        $storeAdmin = User::factory()->create();

        $this->actingAs($storeAdmin)
            ->get(route('admin.configurator.products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Configurator/ProductsIndex')
                ->where('canCreateProducts', true)
                ->where('createProductUrl', route('admin.configurator.products.create'))
            );

        $this->get(route('admin.configurator.products.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Configurator/ProductEditor')
                ->where('product', null)
            );
    }

    public function test_admin_can_manage_catalog_options_and_they_reach_products_and_storefront(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.configurator.taxonomies.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Configurator/CatalogOptions')
                ->has('audiences', 6)
                ->has('categories', 7)
            );

        $this->post(route('admin.configurator.taxonomies.store'), [
            'type' => 'audience',
            'label' => 'Senior Adults',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('configurator_taxonomies', ['type' => 'audience', 'slug' => 'senior-adults']);

        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'senior-footwear',
            'model_url' => '/models/senior-footwear.glb',
            'gender' => 'senior-adults',
            'category' => 'footwear',
        ]);

        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.audienceLabel', 'Senior Adults')
            ->assertJsonPath('data.0.categoryLabel', 'Footwear');
        $this->postJson('/graphql', ['query' => 'query { catalogTaxonomies { type slug label } }'])
            ->assertOk()
            ->assertJsonFragment(['type' => 'audience', 'slug' => 'senior-adults', 'label' => 'Senior Adults']);

        $taxonomy = ConfiguratorTaxonomy::where('slug', 'senior-adults')->firstOrFail();
        $this->delete(route('admin.configurator.taxonomies.destroy', $taxonomy))
            ->assertSessionHasErrors('taxonomy');
        $this->assertDatabaseHas('configurator_taxonomies', ['id' => $taxonomy->id]);

        $product->delete();
        $this->delete(route('admin.configurator.taxonomies.destroy', $taxonomy))
            ->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('configurator_taxonomies', ['id' => $taxonomy->id]);
    }

    public function test_authenticated_admin_can_create_a_glb_product_draft(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/admin/configurator/products', [
            ...$this->validProductData(),
            'model' => UploadedFile::fake()->create('jacket.glb', 256, 'model/gltf-binary'),
            'is_published' => false,
        ]);

        $response->assertSessionHasNoErrors();
        $product = ConfiguratorProduct::firstOrFail();
        $response->assertRedirect(route('admin.configurator.products.edit', $product));
        $this->assertFalse($product->is_published);
        $this->assertSame('men', $product->gender);
        Storage::disk('public')->assertExists($product->model_path);

        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_shopify_store_product_creation_syncs_commerce_fields(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['name' => 'catalog-test.myshopify.com']);
        $shopify = Mockery::mock(ShopifyCatalogSyncService::class);
        $shopify->shouldReceive('shouldSync')->once()->withArgs(fn (User $store) => $store->is($user))->andReturnTrue();
        $shopify->shouldReceive('sync')->once()->andReturnUsing(function (ConfiguratorProduct $product, User $store) use ($user) {
            $this->assertTrue($store->is($user));
            $this->assertSame('active', $product->shopify_status);
            $this->assertSame('49.95', $product->price);
            $this->assertSame(25, $product->inventory_quantity);
            $this->assertSame(['custom', '3d shirt'], $product->tags);

            $product->forceFill([
                'shopify_product_id' => 1001,
                'shopify_variant_id' => 2002,
                'shopify_inventory_item_id' => 3003,
                'shopify_synced_at' => now(),
            ])->save();

            return $product;
        });
        $this->app->instance(ShopifyCatalogSyncService::class, $shopify);

        $this->actingAs($user)->post(route('admin.configurator.products.store'), [
            ...$this->validProductData(),
            'model' => UploadedFile::fake()->create('catalog.glb', 256, 'model/gltf-binary'),
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('configurator_products', [
            'user_id' => $user->id,
            'shopify_product_id' => 1001,
            'shopify_variant_id' => 2002,
            'shopify_inventory_item_id' => 3003,
            'shopify_status' => 'active',
            'price' => 49.95,
            'inventory_quantity' => 25,
        ]);
    }

    public function test_saved_pattern_and_logo_areas_are_rehydrated_when_returning_to_the_editor(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'returning-editor-product',
            'model_url' => '/models/returning-editor-product.glb',
            'is_published' => false,
        ]);
        $area = [
            ...$this->frontPrintArea(),
            'label' => 'Pattern 1',
            'cameraView' => 'front',
            'logoBounds' => ['x' => 0.05, 'y' => 0.2, 'width' => 0.9, 'height' => 0.6],
            'logoPlacement' => [
                'type' => 'surface',
                'origin' => [0.1, 0.2, 0.3],
                'uAxis' => [1, 0, 0],
                'vAxis' => [0, 1, 0],
                'normal' => [0, 0, 1],
                'width' => 0.9,
                'height' => 0.6,
            ],
        ];

        $this->actingAs($user)
            ->put(route('admin.configurator.products.update', $product), [
                ...$this->validProductData(),
                'supports_patterns' => true,
                'supports_logos' => true,
                'is_published' => false,
                'print_areas' => ['patternArea1' => $area],
                'pattern_zones' => ['patternArea1'],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('admin.configurator.products.edit', $product));

        $this->get(route('admin.configurator.products.index'))->assertOk();

        $this->get(route('admin.configurator.products.edit', $product))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Configurator/ProductEditor')
                ->where('product.print_areas.patternArea1.label', 'Pattern 1')
                ->where('product.print_areas.patternArea1.logoPlacement.type', 'surface')
                ->where('product.print_areas.patternArea1.logoBounds.width', 0.9)
                ->where('product.pattern_zones', ['patternArea1'])
            );
    }

    public function test_admin_can_move_a_misclassified_audience_to_categories_without_losing_products(): void
    {
        $user = User::factory()->create();
        $cup = ConfiguratorTaxonomy::create([
            'type' => 'audience',
            'slug' => 'cup',
            'label' => 'Cup',
            'sort_order' => 100,
        ]);
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'custom-cup',
            'name' => 'Custom Cup',
            'gender' => 'cup',
            'category' => 'shirts',
        ]);

        $this->actingAs($user)
            ->patch(route('admin.configurator.taxonomies.move', $cup), [
                'replacement_slug' => 'unisex',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('configurator_taxonomies', [
            'id' => $cup->id,
            'type' => 'category',
            'slug' => 'cup',
        ]);
        $this->assertDatabaseHas('configurator_products', [
            'id' => $product->id,
            'gender' => 'unisex',
            'category' => 'cup',
        ]);
    }

    public function test_catalog_options_reject_obvious_product_types_as_customer_groups(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.configurator.taxonomies.store'), [
                'type' => 'audience',
                'label' => 'Coffee Cups',
            ])
            ->assertSessionHasErrors('label');

        $this->assertDatabaseMissing('configurator_taxonomies', [
            'type' => 'audience',
            'slug' => 'coffee-cups',
        ]);
    }

    public function test_uploaded_pattern_is_sanitized_and_exposes_detected_colors(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'service-jacket',
            'model_url' => '/models/test.glb',
            'supports_patterns' => true,
            'print_areas' => ['front' => $this->frontPrintArea()],
            'pattern_zones' => ['front'],
        ]);
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect width="20" height="20" fill="#123456"/><path stroke="#ABCDEF" d="M0 0L20 20"/></svg>';

        $response = $this->actingAs($user)->post(
            route('admin.configurator.patterns.store', $product),
            [
                'name' => 'Safe stripes',
                'svg' => UploadedFile::fake()->createWithContent('stripes.svg', $svg),
                'is_active' => true,
                'sort_order' => 0,
            ],
        );

        $response->assertSessionHasNoErrors();
        $pattern = $product->patterns()->firstOrFail();
        $stored = Storage::disk('public')->get($pattern->svg_path);
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('onload', $stored);
        $this->assertSame(['#123456', '#ABCDEF'], collect($pattern->color_slots)->pluck('source')->all());
        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.patterns.0.assetUrl', '/storage/'.$pattern->svg_path);
    }

    public function test_admin_can_upload_the_first_svg_pattern_while_creating_a_glb_product(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" fill="#112233"/><path stroke="#AABBCC" d="M0 0L20 20"/></svg>';

        $response = $this->actingAs($user)->post('/admin/configurator/products', [
            ...$this->validProductData(),
            'model' => UploadedFile::fake()->create('pattern-shirt.glb', 256, 'model/gltf-binary'),
            'supports_patterns' => true,
            'is_published' => false,
            'print_areas' => [],
            'pattern_zones' => [],
            'pattern_name' => 'Opening stripes',
            'pattern_svg' => UploadedFile::fake()->createWithContent('opening-stripes.svg', $svg),
            'pattern_is_active' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $product = ConfiguratorProduct::with('patterns')->firstOrFail();
        $this->assertCount(1, $product->patterns);
        $this->assertSame('Opening stripes', $product->patterns->first()->name);
        $this->assertSame(['#112233', '#AABBCC'], collect($product->patterns->first()->color_slots)->pluck('source')->all());
    }

    public function test_admin_can_publish_a_complete_product_directly_during_creation(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" fill="#112233"/></svg>';

        $response = $this->actingAs($user)->post('/admin/configurator/products', [
            ...$this->validProductData(),
            'model' => UploadedFile::fake()->create('ready-shirt.glb', 256, 'model/gltf-binary'),
            'supports_patterns' => true,
            'is_published' => true,
            'print_areas' => ['front' => $this->frontPrintArea()],
            'pattern_zones' => ['front'],
            'pattern_name' => 'Ready pattern',
            'pattern_svg' => UploadedFile::fake()->createWithContent('ready.svg', $svg),
            'pattern_is_active' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $product = ConfiguratorProduct::with('patterns')->firstOrFail();
        $this->assertTrue($product->is_published);
        $this->assertCount(1, $product->patterns);
        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->slug)
            ->assertJsonPath('data.0.patterns.0.id', 'ready-pattern');
    }

    public function test_pattern_product_requires_a_print_binding_only_when_it_is_published(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'draft-pattern-shirt',
            'model_url' => '/models/draft-pattern-shirt.glb',
            'supports_patterns' => true,
            'is_published' => false,
            'print_areas' => [],
        ]);

        $draftResponse = $this->actingAs($user)->put(
            route('admin.configurator.products.update', $product),
            [
                ...$this->validProductData(),
                'supports_patterns' => true,
                'is_published' => false,
                'print_areas' => [],
            ],
        );

        $draftResponse->assertSessionHasNoErrors();
        $this->assertFalse($product->fresh()->is_published);

        $response = $this->actingAs($user)->put(
            route('admin.configurator.products.update', $product),
            [
                ...$this->validProductData(),
                'supports_patterns' => true,
                'is_published' => true,
                'print_areas' => [],
            ],
        );

        $response->assertSessionHasErrors('print_areas');
        $this->assertFalse($product->fresh()->is_published);
    }

    public function test_product_with_an_active_pattern_can_be_published_and_reaches_the_storefront(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'publishable-pattern-shirt',
            'model_url' => '/models/publishable.glb',
            'supports_patterns' => true,
            'is_published' => false,
            'print_areas' => ['front' => $this->frontPrintArea()],
            'pattern_zones' => ['front'],
        ]);
        $product->patterns()->create([
            'name' => 'Ready pattern',
            'slug' => 'ready-pattern',
            'svg_url' => '/patterns/ready.svg',
            'color_slots' => [],
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->put(
            route('admin.configurator.products.update', $product),
            [
                ...$this->validProductData(),
                'supports_patterns' => true,
                'is_published' => true,
                'print_areas' => ['front' => $this->frontPrintArea()],
                'pattern_zones' => ['front'],
            ],
        );

        $response->assertSessionHasNoErrors();
        $this->assertTrue($product->fresh()->is_published);
        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'publishable-pattern-shirt')
            ->assertJsonPath('data.0.patterns.0.id', 'ready-pattern');
    }

    public function test_single_mesh_product_can_publish_with_generated_full_body_projection(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'single-mesh-dress',
            'model_url' => '/models/single-mesh-dress.glb',
            'supports_logos' => false,
            'is_published' => false,
        ]);
        $fullBody = [
            'meshName' => 'BodyMesh',
            'outwardNormalZ' => null,
            'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
            'projection' => ['type' => 'box', 'axis' => null, 'direction' => null],
            'logoBounds' => ['x' => 0.25, 'y' => 0.2, 'width' => 0.5, 'height' => 0.45],
            'logoProjection' => ['type' => 'planar', 'axis' => 'z', 'direction' => 1],
        ];

        $this->actingAs($user)->put(
            route('admin.configurator.products.update', $product),
            [
                ...$this->validProductData(),
                'supports_logos' => true,
                'is_published' => true,
                'print_areas' => ['fullBody' => $fullBody],
            ],
        )->assertSessionHasNoErrors();

        $this->assertTrue($product->fresh()->is_published);
        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.model.printAreas.fullBody.projection.type', 'box')
            ->assertJsonPath('data.0.model.printAreas.fullBody.logoProjection.type', 'planar')
            ->assertJsonPath('data.0.model.printAreas.fullBody.logoBounds.width', 0.5);
    }

    public function test_footwear_and_headwear_artwork_areas_are_valid_product_configuration(): void
    {
        $user = User::factory()->create();
        $cases = [
            ['category' => 'footwear', 'area' => 'toe'],
            ['category' => 'caps', 'area' => 'brim'],
        ];

        foreach ($cases as $index => $case) {
            $product = ConfiguratorProduct::create([
                ...$this->validProductData(),
                'user_id' => $user->id,
                'slug' => $case['category'].'-'.$index,
                'model_url' => '/models/'.$case['category'].'.glb',
                'category' => $case['category'],
                'supports_logos' => false,
                'is_published' => false,
            ]);
            $binding = [
                'meshName' => 'BodyMesh',
                'outwardNormalZ' => null,
                'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
                'projection' => ['type' => 'planar', 'axis' => $case['area'] === 'brim' ? 'y' : 'z', 'direction' => 1],
            ];

            $this->actingAs($user)->put(route('admin.configurator.products.update', $product), [
                ...$this->validProductData(),
                'category' => $case['category'],
                'supports_logos' => true,
                'is_published' => true,
                'print_areas' => [$case['area'] => $binding],
            ])->assertSessionHasNoErrors();

            $this->assertArrayHasKey($case['area'], $product->fresh()->print_areas);
        }
    }

    public function test_box_projected_logo_requires_an_admin_selected_model_face(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'wrap-cup',
            'category' => 'cups',
            'model_url' => '/models/wrap-cup.glb',
            'supports_logos' => false,
            'is_published' => false,
        ]);

        $this->actingAs($user)->put(route('admin.configurator.products.update', $product), [
            ...$this->validProductData(),
            'category' => 'cups',
            'supports_logos' => true,
            'is_published' => true,
            'print_areas' => [
                'fullBody' => [
                    'meshName' => 'CupMesh',
                    'outwardNormalZ' => null,
                    'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
                    'projection' => ['type' => 'box', 'axis' => null, 'direction' => null],
                    'logoBounds' => ['x' => 0.2, 'y' => 0.2, 'width' => 0.6, 'height' => 0.6],
                ],
            ],
        ])->assertSessionHasErrors('print_areas');

        $this->assertFalse($product->fresh()->is_published);
    }

    public function test_multiple_generic_named_surface_areas_are_saved_and_reach_the_storefront(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'future-product',
            'model_url' => '/models/future-product.glb',
            'supports_logos' => false,
            'is_published' => false,
        ]);
        $placement = [
            'type' => 'surface',
            'origin' => [0.12, 0.5, -0.08],
            'uAxis' => [0.707107, 0, 0.707107],
            'vAxis' => [0, 1, 0],
            'normal' => [-0.707107, 0, 0.707107],
            'width' => 0.24,
            'height' => 0.65,
        ];

        $this->actingAs($user)->put(route('admin.configurator.products.update', $product), [
            ...$this->validProductData(),
            'supports_logos' => true,
            'is_published' => true,
            'print_areas' => [
                'logo1' => [
                    'label' => 'Logo 1',
                    'cameraView' => 'front',
                    'meshName' => 'FutureMesh_42',
                    'outwardNormalZ' => null,
                    'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
                    'logoBounds' => ['x' => 0.333846, 'y' => 0.05, 'width' => 0.332308, 'height' => 0.9],
                    'logoPlacement' => $placement,
                ],
                'logo2' => [
                    'label' => 'Logo 2',
                    'cameraView' => 'back',
                    'meshName' => 'FutureMesh_42',
                    'outwardNormalZ' => null,
                    'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
                    'logoBounds' => ['x' => 0.05, 'y' => 0.333846, 'width' => 0.9, 'height' => 0.332308],
                    'logoPlacement' => [
                        ...$placement,
                        'origin' => [-0.12, 0.5, 0.08],
                        'width' => 0.65,
                        'height' => 0.24,
                    ],
                ],
            ],
        ])->assertSessionHasNoErrors();

        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.model.printAreas.logo1.label', 'Logo 1')
            ->assertJsonPath('data.0.model.printAreas.logo1.logoPlacement.type', 'surface')
            ->assertJsonPath('data.0.model.printAreas.logo1.logoPlacement.height', 0.65)
            ->assertJsonPath('data.0.model.printAreas.logo2.label', 'Logo 2')
            ->assertJsonPath('data.0.model.printAreas.logo2.cameraView', 'back')
            ->assertJsonPath('data.0.model.printAreas.logo2.logoPlacement.width', 0.65);
    }

    public function test_logo_placements_and_pattern_areas_are_configured_independently(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'separate-shirt-artwork',
            'model_url' => '/models/separate-shirt-artwork.glb',
            'is_published' => false,
        ]);
        $product->patterns()->create([
            'name' => 'Stripes',
            'slug' => 'stripes',
            'svg_url' => '/patterns/stripes.svg',
            'color_slots' => [],
            'is_active' => true,
        ]);
        $surfacePlacement = [
            'type' => 'surface',
            'origin' => [0, 0.5, 0.1],
            'uAxis' => [1, 0, 0],
            'vAxis' => [0, 1, 0],
            'normal' => [0, 0, 1],
            'width' => 0.4,
            'height' => 0.5,
        ];
        $patternArea = fn (string $label, string $meshName) => [
            'label' => $label,
            'meshName' => $meshName,
            'outwardNormalZ' => null,
            'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
        ];

        $this->actingAs($user)->put(route('admin.configurator.products.update', $product), [
            ...$this->validProductData(),
            'supports_patterns' => true,
            'supports_logos' => true,
            'is_published' => true,
            'pattern_zones' => ['leftSleeve', 'rightSleeve'],
            'print_areas' => [
                'frontLogo' => [
                    ...$patternArea('Front logo', 'BodyMesh'),
                    'logoBounds' => ['x' => 0.2, 'y' => 0.2, 'width' => 0.6, 'height' => 0.6],
                    'logoPlacement' => $surfacePlacement,
                ],
                'backLogo' => [
                    ...$patternArea('Back logo', 'BodyMesh'),
                    'cameraView' => 'back',
                    'logoBounds' => ['x' => 0.2, 'y' => 0.2, 'width' => 0.6, 'height' => 0.6],
                    'logoPlacement' => [...$surfacePlacement, 'normal' => [0, 0, -1]],
                ],
                'leftSleeve' => $patternArea('Left sleeve', 'LeftSleeveMesh'),
                'rightSleeve' => $patternArea('Right sleeve', 'RightSleeveMesh'),
            ],
        ])->assertSessionHasNoErrors();

        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.patternZones', ['leftSleeve', 'rightSleeve'])
            ->assertJsonPath('data.0.model.printAreas.frontLogo.logoPlacement.type', 'surface')
            ->assertJsonPath('data.0.model.printAreas.backLogo.logoPlacement.type', 'surface')
            ->assertJsonMissingPath('data.0.model.printAreas.leftSleeve.logoPlacement')
            ->assertJsonMissingPath('data.0.model.printAreas.rightSleeve.logoPlacement');
    }

    public function test_patterns_capability_requires_an_active_pattern_before_publishing(): void
    {
        $user = User::factory()->create();
        $product = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $user->id,
            'slug' => 'patternless-shirt',
            'model_url' => '/models/patternless.glb',
            'supports_patterns' => true,
            'is_published' => false,
            'print_areas' => ['front' => $this->frontPrintArea()],
            'pattern_zones' => ['front'],
        ]);

        $response = $this->actingAs($user)->put(
            route('admin.configurator.products.update', $product),
            [
                ...$this->validProductData(),
                'supports_patterns' => true,
                'is_published' => true,
                'print_areas' => ['front' => $this->frontPrintArea()],
                'pattern_zones' => ['front'],
            ],
        );

        $response->assertSessionHasErrors('is_published');
        $this->assertFalse($product->fresh()->is_published);
    }

    public function test_drafts_and_inactive_patterns_do_not_reach_the_storefront_catalog(): void
    {
        $store = User::factory()->create([
            'name' => 'catalog-store.myshopify.com',
            'storefront_key' => 'catalog-store.myshopify.com',
        ]);
        $published = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $store->id,
            'slug' => 'published-shirt',
            'model_url' => '/models/published.glb',
        ]);
        ConfiguratorProduct::create([
            ...$this->validProductData(),
            'user_id' => $store->id,
            'name' => 'Draft shirt',
            'slug' => 'draft-shirt',
            'model_url' => '/models/draft.glb',
            'is_published' => false,
        ]);
        $published->patterns()->create([
            'name' => 'Hidden', 'slug' => 'hidden', 'svg_url' => '/patterns/hidden.svg',
            'color_slots' => [], 'is_active' => false,
        ]);

        $this->getJson(route('store.configurator.catalog', ['store' => $store->storefront_key]))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonCount(0, 'data.0.patterns');
    }

    private function validProductData(): array
    {
        return [
            'name' => 'Service Jacket',
            'shopify_status' => 'active',
            'price' => '49.95',
            'inventory_quantity' => 25,
            'tags' => 'custom, 3d shirt',
            'gender' => 'men',
            'category' => 'jackets',
            'description' => 'Admin-managed product',
            'fit_height' => 2.45,
            'mesh_zones' => ['BodyMesh' => 'body'],
            'print_areas' => [],
            'color_zones' => [['id' => 'body', 'label' => 'Body', 'defaultColor' => '#F8FAFC']],
            'allowed_colors' => ['#F8FAFC', '#111827'],
            'pattern_zones' => [],
            'supports_colors' => true,
            'supports_patterns' => false,
            'supports_logos' => false,
            'is_published' => true,
            'sort_order' => 0,
        ];
    }

    private function frontPrintArea(): array
    {
        return [
            'meshName' => 'BodyMesh',
            'outwardNormalZ' => null,
            'uvBounds' => ['min' => [0, 0], 'max' => [1, 1]],
        ];
    }
}
