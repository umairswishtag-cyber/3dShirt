<?php

namespace App\Http\Controllers;

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
        ]);
    }

    public function catalog(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->publishedCatalog()]);
    }
}
