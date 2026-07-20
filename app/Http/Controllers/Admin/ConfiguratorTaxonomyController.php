<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConfiguratorProduct;
use App\Models\ConfiguratorTaxonomy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'label' => [
                'required',
                'string',
                'max:80',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    $label = Str::lower((string) $value);
                    $type = $request->input('type');
                    $productTerms = '/\b(shirts?|t-?shirts?|hoodies?|dresses?|pants?|jackets?|shoes?|footwears?|caps?|hats?|cups?|mugs?|bags?|socks?)\b/i';
                    $audienceTerms = '/\b(men|man|women|woman|kids?|children|unisex|adults?|teenagers?|boys?|girls?)\b/i';

                    if ($type === ConfiguratorTaxonomy::TYPE_AUDIENCE && preg_match($productTerms, $label)) {
                        $fail('This looks like a product category. Choose “Product category — what it is” instead.');
                    }
                    if ($type === ConfiguratorTaxonomy::TYPE_CATEGORY && preg_match($audienceTerms, $label)) {
                        $fail('This looks like a customer group. Choose “Customer group — who it is for” instead.');
                    }
                },
            ],
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

    public function move(Request $request, ConfiguratorTaxonomy $taxonomy): RedirectResponse
    {
        $targetType = $taxonomy->type === ConfiguratorTaxonomy::TYPE_AUDIENCE
            ? ConfiguratorTaxonomy::TYPE_CATEGORY
            : ConfiguratorTaxonomy::TYPE_AUDIENCE;
        $sourceColumn = $taxonomy->type === ConfiguratorTaxonomy::TYPE_AUDIENCE ? 'gender' : 'category';
        $targetColumn = $targetType === ConfiguratorTaxonomy::TYPE_AUDIENCE ? 'gender' : 'category';
        $productsCount = ConfiguratorProduct::where($sourceColumn, $taxonomy->slug)->count();

        $data = $request->validate([
            'replacement_slug' => [
                Rule::requiredIf($productsCount > 0),
                'nullable',
                'string',
                Rule::exists('configurator_taxonomies', 'slug')->where('type', $taxonomy->type),
                Rule::notIn([$taxonomy->slug]),
            ],
        ]);

        $matchingTarget = ConfiguratorTaxonomy::ofType($targetType)
            ->get()
            ->first(fn (ConfiguratorTaxonomy $candidate) => Str::singular($candidate->slug) === Str::singular($taxonomy->slug));
        $targetSlug = $matchingTarget?->slug ?? $taxonomy->slug;
        $targetLabel = $matchingTarget?->label ?? $taxonomy->label;

        DB::transaction(function () use ($taxonomy, $matchingTarget, $targetType, $targetSlug, $sourceColumn, $targetColumn, $data, $productsCount) {
            if ($productsCount > 0) {
                ConfiguratorProduct::where($sourceColumn, $taxonomy->slug)->update([
                    $sourceColumn => $data['replacement_slug'],
                    $targetColumn => $targetSlug,
                ]);
            }

            if ($matchingTarget) {
                $taxonomy->delete();
            } else {
                $taxonomy->update([
                    'type' => $targetType,
                    'sort_order' => ((int) ConfiguratorTaxonomy::ofType($targetType)->max('sort_order')) + 10,
                ]);
            }
        });

        $destination = $targetType === ConfiguratorTaxonomy::TYPE_CATEGORY ? 'product categories' : 'customer groups';
        $productMessage = $productsCount > 0 ? " {$productsCount} linked product(s) were reassigned safely." : '';

        return back()->with('success', "{$targetLabel} was moved to {$destination}.{$productMessage}");
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
