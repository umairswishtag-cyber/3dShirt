<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConfiguratorProduct;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClothMotionSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user()->isPlatformAdmin();

        return Inertia::render('Admin/Configurator/ClothMotionSettings', [
            'canManageAccess' => $admin,
            'canConfigureClothMotion' => $request->user()->canConfigureClothMotion(),
            'stores' => $admin ? User::query()->where('is_platform_admin', false)
                ->orderBy('name')->get(['id', 'name', 'email', 'can_configure_cloth_motion'])
                ->filter(fn (User $store) => ! $store->isPlatformAdmin())->values() : [],
            'products' => ConfiguratorProduct::query()
                ->when(! $admin, fn ($query) => $query->where('user_id', $request->user()->id))
                ->with('owner:id,name,can_configure_cloth_motion,is_platform_admin,email')
                ->orderBy('name')->get(['id', 'user_id', 'name', 'cloth_motion'])
                ->map(fn (ConfiguratorProduct $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'owner' => $product->owner?->name,
                    'enabled' => (bool) ($product->cloth_motion['enabled'] ?? false),
                    'access' => (bool) $product->owner?->canConfigureClothMotion(),
                ]),
        ]);
    }

    public function updateAccess(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isPlatformAdmin(), 403);
        abort_if($user->isPlatformAdmin(), 422, 'Platform administrators already have access.');
        $data = $request->validate(['can_configure_cloth_motion' => ['required', 'boolean']]);
        // Never mass-assign this permission from vendor profile/product requests.
        $user->forceFill($data)->save();

        return back()->with('success', 'Cloth motion access updated.');
    }
}
