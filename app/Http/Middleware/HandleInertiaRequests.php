<?php

namespace App\Http\Middleware;

use App\Services\Production\ProductionRequestAlertService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'embedded';

    public function __construct()
    {
        if (! request()->get('shop')) {
            $this->rootView = 'non_embedded';
        }
    }

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $routeName = (string) $request->route()?->getName();
        $alertReader = str_starts_with($routeName, 'store.customer.')
            || str_starts_with($routeName, 'customer.')
                ? Auth::guard('customer')->user()
                : Auth::user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => Auth::user(),
            ],
            'customer' => Auth::guard('customer')->user(),
            'chatAlerts' => fn () => app(ProductionRequestAlertService::class)->summary($alertReader),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'ziggy' => function () use ($request) {
                return array_merge((new Ziggy)->toArray(), [
                    'location' => $request->url(),
                    'query' => $request->query(),
                ]);
            },
        ]);
    }
}
