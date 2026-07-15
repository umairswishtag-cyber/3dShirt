<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\ConfiguratorPatternController;
use App\Http\Controllers\Admin\ConfiguratorProductController;
use App\Http\Controllers\Admin\ConfiguratorTaxonomyController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CustomerAccountController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StorefrontConfiguratorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Osiset\ShopifyApp\Util;

Route::get('/api/configurator/catalog', [StorefrontConfiguratorController::class, 'catalog'])
    ->name('configurator.catalog');

Route::get('/', function (Request $request) {
    if ($request->filled('shop')) {
        return redirect()->route(Route::has('authenticate') ? 'authenticate' : 'login', $request->query());
    }

    return Auth::guard('customer')->check()
        ? redirect()->route('customer.dashboard')
        : redirect()->route('customer.login');
})->name('home');

Route::middleware('customer.guest')->group(function () {
    Route::get('/login', [CustomerAccountController::class, 'login'])->name('customer.login');
    Route::get('/register', [CustomerAccountController::class, 'register'])->name('customer.register');
});

Route::get('/account/login', fn () => redirect()->route('customer.login'));
Route::get('/account/register', fn () => redirect()->route('customer.register'));

Route::middleware('customer.auth')->group(function () {
    Route::get('/configurator', [StorefrontConfiguratorController::class, 'show'])->name('configurator');
    Route::get('/account', [CustomerAccountController::class, 'dashboard'])->name('customer.dashboard');
});

if (! config('shopify-app.appbridge_enabled')) {
    Route::match(
        ['GET', 'POST'],
        '/authenticate',
        AuthenticatedSessionController::class.'@authenticate'
    )
        ->name('authenticate');
    Route::get(
        '/authenticate/token',
        AuthenticatedSessionController::class.'@authenticate'
    )
        ->middleware(['verify.shopify'])
        ->name(Util::getShopifyConfig('route_names.authenticate.token'));
}

Route::middleware(['auth'])->group(function () {

    Route::get('/admin', AdminDashboardController::class)->name('admin.dashboard');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');

    Route::prefix('admin/configurator')->name('admin.configurator.')->group(function () {
        Route::get('catalog-options', [ConfiguratorTaxonomyController::class, 'index'])->name('taxonomies.index');
        Route::post('catalog-options', [ConfiguratorTaxonomyController::class, 'store'])->name('taxonomies.store');
        Route::delete('catalog-options/{taxonomy}', [ConfiguratorTaxonomyController::class, 'destroy'])->name('taxonomies.destroy');
        Route::get('preview/{product?}', [StorefrontConfiguratorController::class, 'preview'])
            ->name('preview');
        Route::resource('products', ConfiguratorProductController::class)->except('show');
        Route::post('products/{product}/patterns', [ConfiguratorPatternController::class, 'store'])
            ->name('patterns.store');
        Route::put('products/{product}/patterns/{pattern}', [ConfiguratorPatternController::class, 'update'])
            ->name('patterns.update');
        Route::delete('products/{product}/patterns/{pattern}', [ConfiguratorPatternController::class, 'destroy'])
            ->name('patterns.destroy');
    });

});

require __DIR__.'/auth.php';
