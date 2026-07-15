<?php

namespace App\Http\Controllers;

use App\Models\ConfiguratorProduct;
use App\Services\Configurator\ConfiguratorCatalogService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontConfiguratorController extends Controller
{
    public function __construct(
        private readonly ConfiguratorCatalogService $catalog,
    ) {}

    public function show(): Response
    {
        return Inertia::render('Configurator/ConfiguratorPage', [
            'catalog' => $this->catalog->publishedCatalog(),
            'adminPreview' => false,
            'initialProductId' => null,
        ]);
    }

    public function preview(?ConfiguratorProduct $product = null): Response
    {
        return Inertia::render('Configurator/ConfiguratorPage', [
            'catalog' => $this->catalog->publishedCatalog(),
            'adminPreview' => true,
            'initialProductId' => $product?->is_published ? $product->slug : null,
        ]);
    }

    public function catalog(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->publishedCatalog()]);
    }
}
