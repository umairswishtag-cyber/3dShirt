<?php

namespace Database\Seeders;

use App\Models\ConfiguratorProduct;
use Illuminate\Database\Seeder;

class ConfiguratorCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $palette = ['#F8FAFC', '#111827', '#172554', '#2563EB', '#DC2626', '#16A34A', '#FACC15', '#F97316', '#64748B', '#7C3AED'];
        $coverage = ['front', 'back', 'leftSleeve', 'rightSleeve'];

        $shirt = ConfiguratorProduct::updateOrCreate(
            ['slug' => 'basic-tshirt'],
            [
                'name' => 'Men Basic T-Shirt',
                'gender' => 'men',
                'category' => 'shirts',
                'description' => 'Full pattern, logo, and four-zone color customization.',
                'model_url' => '/models/t-shirt/t-shirt.glb',
                'fit_height' => 2.45,
                'mesh_zones' => [
                    'Object_6' => 'collar', 'Object_8' => 'collar', 'Object_10' => 'body',
                    'Object_11' => 'body', 'Object_12' => 'body', 'Object_14' => 'body',
                    'Object_15' => 'body', 'Object_16' => 'body', 'Object_18' => 'rightSleeve',
                    'Object_20' => 'leftSleeve',
                ],
                'print_areas' => [
                    'front' => ['meshName' => 'Object_10', 'outwardNormalZ' => null, 'uvBounds' => ['min' => [-236.45164489746094, -406.00201416015625], 'max' => [236.44277954101562, 297.2185974121094]]],
                    'back' => ['meshName' => 'Object_14', 'outwardNormalZ' => null, 'uvBounds' => ['min' => [-250.21524047851562, -369.1955261230469], 'max' => [249.80685424804688, 343.9002380371094]]],
                    'leftSleeve' => ['meshName' => 'Object_20', 'outwardNormalZ' => null, 'uvBounds' => ['min' => [-198.5648193359375, -101.9967041015625], 'max' => [198.56475830078125, 102.029052734375]]],
                    'rightSleeve' => ['meshName' => 'Object_18', 'outwardNormalZ' => null, 'uvBounds' => ['min' => [-198.56475830078125, -101.9967041015625], 'max' => [198.5648193359375, 102.029052734375]]],
                ],
                'color_zones' => [
                    ['id' => 'body', 'label' => 'Body', 'defaultColor' => '#F8FAFC'],
                    ['id' => 'leftSleeve', 'label' => 'Left sleeve', 'defaultColor' => '#F8FAFC'],
                    ['id' => 'rightSleeve', 'label' => 'Right sleeve', 'defaultColor' => '#F8FAFC'],
                    ['id' => 'collar', 'label' => 'Collar', 'defaultColor' => '#0F172A'],
                ],
                'allowed_colors' => $palette,
                'pattern_zones' => $coverage,
                'supports_colors' => true,
                'supports_patterns' => true,
                'supports_logos' => true,
                'is_published' => true,
                'sort_order' => 10,
            ],
        );

        $patterns = [
            ['3d-style', '3D Style', '/patterns/3d-style.svg', [['base', 'Base', '#6541AE'], ['shadow', 'Shadow', '#521791'], ['highlight', 'Highlight', '#84C5DC'], ['accent', 'Accent', '#FF8000']]],
            ['animals', 'Animals', '/patterns/animals.svg', [['base', 'Base', '#FFFFFF'], ['art', 'Artwork', '#000000']]],
            ['circle-lines', 'Circle Lines', '/patterns/circle-lines.svg', [['base', 'Base', '#547B9B'], ['line', 'Line', '#D2C8BE'], ['highlight', 'Highlight', '#FFFFFF']]],
            ['design-art', 'Design Art', '/patterns/design-art.svg', [['base', 'Base', '#293456'], ['accent', 'Accent', '#00A4B9']]],
            ['kuchar-muchar', 'Kuchar Muchar', '/patterns/kuchar-muchar.svg', [['base', 'Base', '#CED2D0'], ['art', 'Artwork', '#939798']]],
            ['multi-color-lines', 'Multi Lines', '/patterns/multi-color-lines.svg', [['base', 'Base', '#293456'], ['stripe1', 'Stripe 1', '#006384'], ['stripe2', 'Stripe 2', '#00A676'], ['stripe3', 'Stripe 3', '#E2E54C']]],
            ['pattern-1', 'Diagonal', '/patterns/pattern-1.svg', [['base', 'Base', '#152B58'], ['stripe', 'Stripe', '#EB382E']]],
            ['triangles', 'Triangles', '/patterns/triangles.svg', [['base', 'Base', '#9CD5C2'], ['accent', 'Accent', '#C94528']]],
        ];

        foreach ($patterns as $index => [$slug, $name, $url, $slots]) {
            $shirt->patterns()->updateOrCreate(['slug' => $slug], [
                'name' => $name,
                'svg_url' => $url,
                'color_slots' => array_map(fn ($slot) => ['id' => $slot[0], 'label' => $slot[1], 'source' => $slot[2]], $slots),
                'is_active' => true,
                'sort_order' => $index * 10,
            ]);
        }

        ConfiguratorProduct::updateOrCreate(['slug' => 'men-shirt-2'], [
            'name' => 'Men T-Shirt Model 2', 'gender' => 'men', 'category' => 'shirts',
            'description' => 'Single-zone solid-color garment. Product UV adapter pending.',
            'model_url' => '/models/men/man-2.glb', 'fit_height' => 2.45,
            'mesh_zones' => ['t_shirt_Model3_t_shirt_Model30.002_0' => 'body', 't_shirt_Model3_t_shirt_Model31.002_0' => 'body'],
            'print_areas' => [], 'color_zones' => [['id' => 'body', 'label' => 'Body', 'defaultColor' => '#F8FAFC']],
            'allowed_colors' => $palette, 'pattern_zones' => [], 'supports_colors' => true,
            'supports_patterns' => false, 'supports_logos' => false, 'is_published' => true, 'sort_order' => 20,
        ]);

        ConfiguratorProduct::updateOrCreate(['slug' => 'women-tshirt-dress'], [
            'name' => 'Women T-Shirt Dress', 'gender' => 'women', 'category' => 'dresses',
            'description' => 'Single-zone solid-color dress. This source GLB has no UV map.',
            'model_url' => '/models/women/women.glb', 'fit_height' => 2.45,
            'mesh_zones' => ['Object_2' => 'body'], 'print_areas' => [],
            'color_zones' => [['id' => 'body', 'label' => 'Body', 'defaultColor' => '#F8FAFC']],
            'allowed_colors' => $palette, 'pattern_zones' => [], 'supports_colors' => true,
            'supports_patterns' => false, 'supports_logos' => false, 'is_published' => true, 'sort_order' => 30,
        ]);
    }
}
