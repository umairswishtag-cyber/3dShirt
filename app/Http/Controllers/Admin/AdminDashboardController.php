<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConfiguratorPattern;
use App\Models\ConfiguratorProduct;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $canCreateProducts = ! $request->user()->isPlatformAdmin();
        $products = ConfiguratorProduct::query()
            ->when($canCreateProducts, fn ($query) => $query->where('user_id', $request->user()->id));
        $productIds = (clone $products)->pluck('id');

        return Inertia::render('Admin/Dashboard', [
            'canCreateProducts' => $canCreateProducts,
            'createProductUrl' => $canCreateProducts
                ? route('admin.configurator.products.create')
                : null,
            'summary' => [
                'products' => (clone $products)->count(),
                'published' => (clone $products)->where('is_published', true)->count(),
                'drafts' => (clone $products)->where('is_published', false)->count(),
                'patterns' => ConfiguratorPattern::whereIn('configurator_product_id', $productIds)->where('is_active', true)->count(),
            ],
            'recentProducts' => (clone $products)
                ->latest('updated_at')
                ->limit(5)
                ->get(['id', 'name', 'gender', 'category', 'is_published', 'updated_at']),
        ]);
    }
}
