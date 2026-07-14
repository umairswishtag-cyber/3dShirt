<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\ConfiguratorPatternController;
use App\Http\Controllers\Admin\ConfiguratorProductController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StorefrontConfiguratorController;
use Illuminate\Support\Facades\Route;
use Osiset\ShopifyApp\Util;

Route::get('/configurator', [StorefrontConfiguratorController::class, 'show'])
    ->name('configurator');
Route::get('/api/configurator/catalog', [StorefrontConfiguratorController::class, 'catalog'])
    ->name('configurator.catalog');

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

Route::group(['middleware' => ['verify.embedded', 'verify.shopify']], function () {

    Route::get('/', function () {
        return null;
    })->name('home');

});

Route::middleware(['auth'])->group(function () {

    Route::get('/admin', AdminDashboardController::class)->name('admin.dashboard');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');

    Route::prefix('admin/configurator')->name('admin.configurator.')->group(function () {
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
