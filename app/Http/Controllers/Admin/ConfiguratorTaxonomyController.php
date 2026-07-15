<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConfiguratorProduct;
use App\Models\ConfiguratorTaxonomy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ConfiguratorTaxonomyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Configurator/CatalogOptions', [
            'audiences' => $this->items(ConfiguratorTaxonomy::TYPE_AUDIENCE),
            'categories' => $this->items(ConfiguratorTaxonomy::TYPE_CATEGORY),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge(['slug' => Str::slug($request->string('label')->toString())]);
        $data = $request->validate([
            'type' => ['required', Rule::in([ConfiguratorTaxonomy::TYPE_AUDIENCE, ConfiguratorTaxonomy::TYPE_CATEGORY])],
            'label' => ['required', 'string', 'max:80'],
            'slug' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('configurator_taxonomies')->where('type', $request->input('type'))],
        ]);

        $data['sort_order'] = ((int) ConfiguratorTaxonomy::ofType($data['type'])->max('sort_order')) + 10;
        ConfiguratorTaxonomy::create($data);

        return back()->with('success', $data['label'].' is now available when configuring products.');
    }

    public function destroy(ConfiguratorTaxonomy $taxonomy): RedirectResponse
    {
        $column = $taxonomy->type === ConfiguratorTaxonomy::TYPE_AUDIENCE ? 'gender' : 'category';
        if (ConfiguratorProduct::where($column, $taxonomy->slug)->exists()) {
            return back()->withErrors(['taxonomy' => "{$taxonomy->label} is used by a product. Move or delete those products first."]);
        }

        $label = $taxonomy->label;
        $taxonomy->delete();

        return back()->with('success', $label.' was removed.');
    }

    private function items(string $type): array
    {
        return ConfiguratorTaxonomy::ofType($type)
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get(['id', 'slug', 'label'])
            ->map(fn (ConfiguratorTaxonomy $item) => [
                ...$item->toArray(),
                'productsCount' => ConfiguratorProduct::where($type === ConfiguratorTaxonomy::TYPE_AUDIENCE ? 'gender' : 'category', $item->slug)->count(),
            ])->all();
    }
}
