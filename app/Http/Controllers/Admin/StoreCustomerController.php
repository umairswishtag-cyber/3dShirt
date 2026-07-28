<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StoreCustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user();
        $customers = Customer::query()
            ->when(! $admin->isPlatformAdmin(), fn ($query) => $query->where('user_id', $admin->id))
            ->when($admin->isPlatformAdmin(), fn ($query) => $query->with('store:id,name,storefront_key'))
            ->withCount('designs')
            ->latest()
            ->paginate(25)
            ->through(fn (Customer $customer) => [
                'id' => $customer->public_id,
                'name' => $customer->name,
                'email' => $customer->email,
                'designsCount' => $customer->designs_count,
                'joinedAt' => $customer->created_at?->toIso8601String(),
                'store' => $customer->relationLoaded('store') ? $customer->store?->only(['name', 'storefront_key']) : null,
            ]);

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $customers,
            'platformView' => $admin->isPlatformAdmin(),
        ]);
    }
}
