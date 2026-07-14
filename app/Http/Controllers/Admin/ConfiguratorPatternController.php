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
        $this->products->addPattern($product, $request->validated());

        return back()->with('success', 'Pattern uploaded and its SVG color slots were detected.');
    }

    public function update(Request $request, ConfiguratorProduct $product, ConfiguratorPattern $pattern): RedirectResponse
    {
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

    public function destroy(ConfiguratorProduct $product, ConfiguratorPattern $pattern): RedirectResponse
    {
        abort_unless($pattern->configurator_product_id === $product->id, 404);
        $this->products->deletePattern($pattern);

        return back()->with('success', 'Pattern deleted.');
    }
}
