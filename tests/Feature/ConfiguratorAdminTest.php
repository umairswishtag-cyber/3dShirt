<?php

namespace Tests\Feature;

use App\Models\ConfiguratorProduct;
use App\Models\ConfiguratorTaxonomy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
                ->where('summary.products', 0)
                ->has('recentProducts')
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
            ->assertJsonPath('data.0.model.printAreas.fullBody.projection.type', 'box');
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
        $published = ConfiguratorProduct::create([
            ...$this->validProductData(),
            'slug' => 'published-shirt',
            'model_url' => '/models/published.glb',
        ]);
        ConfiguratorProduct::create([
            ...$this->validProductData(),
            'name' => 'Draft shirt',
            'slug' => 'draft-shirt',
            'model_url' => '/models/draft.glb',
            'is_published' => false,
        ]);
        $published->patterns()->create([
            'name' => 'Hidden', 'slug' => 'hidden', 'svg_url' => '/patterns/hidden.svg',
            'color_slots' => [], 'is_active' => false,
        ]);

        $this->getJson('/api/configurator/catalog')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonCount(0, 'data.0.patterns');
    }

    private function validProductData(): array
    {
        return [
            'name' => 'Service Jacket',
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
