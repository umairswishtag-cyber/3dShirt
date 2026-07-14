<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConfiguratorPattern;
use App\Models\ConfiguratorProduct;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'summary' => [
                'products' => ConfiguratorProduct::count(),
                'published' => ConfiguratorProduct::where('is_published', true)->count(),
                'drafts' => ConfiguratorProduct::where('is_published', false)->count(),
                'patterns' => ConfiguratorPattern::where('is_active', true)->count(),
            ],
            'recentProducts' => ConfiguratorProduct::query()
                ->latest('updated_at')
                ->limit(5)
                ->get(['id', 'name', 'gender', 'category', 'is_published', 'updated_at']),
        ]);
    }
}
