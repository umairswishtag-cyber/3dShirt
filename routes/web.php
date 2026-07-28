<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\ChatbotAccessController;
use App\Http\Controllers\Admin\StoreCustomerController;
use App\Http\Controllers\Admin\ConfiguratorPatternController;
use App\Http\Controllers\Admin\ConfiguratorProductController;
use App\Http\Controllers\Admin\ConfiguratorTaxonomyController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CustomerAccountController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ShopifyCustomerSessionController;
use App\Http\Controllers\ShopifyConfiguratorProxyController;
use App\Http\Controllers\StorefrontConfiguratorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Osiset\ShopifyApp\Util;
use App\Services\Storefront\StorefrontContext;
use Nuwave\Lighthouse\Http\GraphQLController;
use Nuwave\Lighthouse\Http\Middleware\AcceptJson;
use Nuwave\Lighthouse\Http\Middleware\AttemptAuthentication;
use Nuwave\Lighthouse\Http\Middleware\EnsureXHR;

Route::get('/shopify/app-proxy/configurator', [ShopifyCustomerSessionController::class, 'proxy'])
    ->name('shopify.app-proxy.configurator');
Route::prefix('/shopify/app-proxy/configurator')
    ->middleware('shopify.proxy.customer')
    ->group(function () {
        Route::get('/bootstrap', [ShopifyConfiguratorProxyController::class, 'bootstrap'])
            ->name('shopify.app-proxy.bootstrap');
        Route::get('/assets/{path}', [ShopifyConfiguratorProxyController::class, 'asset'])
            ->where('path', '.*')
            ->name('shopify.app-proxy.asset');
        Route::post('/graphql', GraphQLController::class)
            ->middleware([EnsureXHR::class, AcceptJson::class, AttemptAuthentication::class])
            ->name('shopify.app-proxy.graphql');
    });
Route::get(
    '/shopify/customer/session',
    [ShopifyCustomerSessionController::class, 'session'],
)
    ->middleware('signed:relative')
    ->name('shopify.customer.session');

Route::get('/api/configurator/catalog', [StorefrontConfiguratorController::class, 'catalog'])
    ->middleware('storefront')
    ->name('configurator.catalog');

Route::prefix('store/{store}')->middleware('storefront')->group(function () {
    Route::middleware('customer.guest')->group(function () {
        Route::get('/login', [CustomerAccountController::class, 'login'])->name('store.customer.login');
        Route::get('/register', [CustomerAccountController::class, 'register'])->name('store.customer.register');
    });

    Route::middleware('customer.auth')->group(function () {
        Route::get('/configurator', [StorefrontConfiguratorController::class, 'show'])->name('store.configurator');
        Route::get('/account', [CustomerAccountController::class, 'dashboard'])->name('store.customer.dashboard');
    });

    Route::get('/api/configurator/catalog', [StorefrontConfiguratorController::class, 'catalog'])
        ->name('store.configurator.catalog');
});

Route::get('/', function (Request $request, StorefrontContext $storefront) {
    if ($request->filled('shop')) {
        return redirect()->route(Route::has('authenticate') ? 'authenticate' : 'login', $request->query());
    }

    $customer = Auth::guard('customer')->user();
    if ($customer?->store) {
        return redirect()->route('store.customer.dashboard', ['store' => $customer->store->storefront_key]);
    }

    $store = $storefront->resolve($request);

    return redirect()->route('store.customer.login', ['store' => $store->storefront_key]);
})->name('home');

Route::middleware(['storefront', 'customer.guest'])->group(function () {
    Route::get('/login', [CustomerAccountController::class, 'login'])->name('customer.login');
    Route::get('/register', [CustomerAccountController::class, 'register'])->name('customer.register');
});

Route::get('/account/login', fn () => redirect()->route('customer.login'));
Route::get('/account/register', fn () => redirect()->route('customer.register'));

Route::middleware(['storefront', 'customer.auth'])->group(function () {
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
    Route::get('/admin/chatbot', [ChatbotAccessController::class, 'index'])->name('admin.chatbot.index');
    Route::post('/admin/chatbot/request', [ChatbotAccessController::class, 'requestAccess'])->name('admin.chatbot.request');
    Route::patch('/admin/chatbot/users/{user}', [ChatbotAccessController::class, 'update'])->name('admin.chatbot.update');
    Route::get('/admin/customers', [StoreCustomerController::class, 'index'])->name('admin.customers.index');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');

    Route::prefix('admin/configurator')->name('admin.configurator.')->group(function () {
        Route::get('catalog-options', [ConfiguratorTaxonomyController::class, 'index'])->name('taxonomies.index');
        Route::post('catalog-options', [ConfiguratorTaxonomyController::class, 'store'])->name('taxonomies.store');
        Route::patch('catalog-options/{taxonomy}/move', [ConfiguratorTaxonomyController::class, 'move'])->name('taxonomies.move');
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
