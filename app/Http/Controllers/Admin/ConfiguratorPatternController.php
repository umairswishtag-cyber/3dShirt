<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConfiguratorPatternRequest;
use App\Models\ConfiguratorPattern;
use App\Models\ConfiguratorProduct;
use App\Services\Configurator\ConfiguratorProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ConfiguratorPatternController extends Controller
{
    public function __construct(
        private readonly ConfiguratorProductService $products,
    ) {}

    public function store(StoreConfiguratorPatternRequest $request, ConfiguratorProduct $product): RedirectResponse
    {
        $this->authorizeStoreProduct($request, $product);
        $pattern = $this->products->addPattern($product, $request->validated());

        $message = match (true) {
            ! $pattern->is_active => 'Pattern uploaded as hidden. Activate it when it is ready.',
            ! $product->is_published => 'Pattern uploaded. It will appear after this draft is published.',
            ! $product->supports_patterns => 'Pattern uploaded, but SVG patterns must be enabled before customers can see it.',
            default => 'Pattern uploaded and is now visible on the storefront.',
        };

        return back()->with('success', $message);
    }

    public function update(Request $request, ConfiguratorProduct $product, ConfiguratorPattern $pattern): RedirectResponse
    {
        $this->authorizeStoreProduct($request, $product);
        abort_unless($pattern->configurator_product_id === $product->id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
            'color_slots' => ['required', 'array', 'max:12'],
            'color_slots.*.id' => ['required', 'string', 'max:64'],
            'color_slots.*.label' => ['required', 'string', 'max:80'],
            'color_slots.*.source' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);
        $this->products->updatePattern($pattern, $data);

        return back()->with('success', 'Pattern settings saved.');
    }

    public function destroy(Request $request, ConfiguratorProduct $product, ConfiguratorPattern $pattern): RedirectResponse
    {
        $this->authorizeStoreProduct($request, $product);
        abort_unless($pattern->configurator_product_id === $product->id, 404);
        $this->products->deletePattern($pattern);

        return back()->with('success', 'Pattern deleted.');
    }

    private function authorizeStoreProduct(Request $request, ConfiguratorProduct $product): void
    {
        abort_unless(
            $request->user()->isPlatformAdmin() || (int) $product->user_id === (int) $request->user()->id,
            404,
        );
    }
}
