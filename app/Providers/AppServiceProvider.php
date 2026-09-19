<?php

namespace App\Providers;

use App\Actions\InstallShopWithExpiringToken;
use App\Services\Shopify\ShopifyTokenManager;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Osiset\ShopifyApp\Actions\InstallShop;
use Osiset\ShopifyApp\Actions\VerifyThemeSupport;
use Osiset\ShopifyApp\Contracts\Commands\Shop as ShopifyShopCommand;
use Osiset\ShopifyApp\Contracts\Queries\Shop as ShopifyShopQuery;
use App\Repositories\Order\OrderRepository;
use App\Repositories\Product\ProductRepository;
use App\Repositories\Order\OrderRepositoryInterface;
use App\Repositories\Product\ProductRepositoryInterface;
use App\Repositories\ProductMedia\ProductMediaRepository;
use App\Repositories\OrderCustomer\OrderCustomerRepository;
use App\Repositories\OrderLineItem\OrderLineItemRepository;
use App\Repositories\ProductVarient\ProductVarientRepository;
use App\Repositories\OrderFulfillment\OrderFulfillmentRepository;
use App\Repositories\ProductMedia\ProductMediaRepositoryInterface;
use App\Repositories\OrderCustomer\OrderCustomerRepositoryInterface;
use App\Repositories\OrderLineItem\OrderLineItemRepositoryInterface;
use App\Repositories\ProductVarient\ProductVarientRepositoryInterface;
use App\Repositories\OrderShippingAddress\OrderShippingAddressRepository;
use App\Repositories\OrderFulfillment\OrderFulfillmentRepositoryInterface;
use App\Repositories\OrderShippingAddress\OrderShippingAddressRepositoryInterface;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(InstallShop::class, fn ($app) => new InstallShopWithExpiringToken(
            $app->make(ShopifyShopQuery::class),
            $app->make(ShopifyShopCommand::class),
            $app->make(VerifyThemeSupport::class),
            $app->make(ShopifyTokenManager::class),
        ));

        $this->app->bind(
                ProductRepositoryInterface::class,
                ProductRepository::class
            );
        $this->app->bind(
                ProductVarientRepositoryInterface::class,
                ProductVarientRepository::class
            );
        $this->app->bind(
                ProductMediaRepositoryInterface::class,
                ProductMediaRepository::class
            );
        $this->app->bind(
                OrderRepositoryInterface::class,
                OrderRepository::class
            );

        $this->app->bind(
            OrderCustomerRepositoryInterface::class,
                OrderCustomerRepository::class
            );
        $this->app->bind(
            OrderFulfillmentRepositoryInterface::class,
                OrderFulfillmentRepository::class
            );
        $this->app->bind(
            OrderShippingAddressRepositoryInterface::class,
                OrderShippingAddressRepository::class
            );
        $this->app->bind(
            OrderLineItemRepositoryInterface::class,
                OrderLineItemRepository::class
            );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // \URL::forceScheme('https');
        Vite::useHotFile(
            $this->app->environment('production')
                ? storage_path('framework/vite.hot.disabled')
                : storage_path('framework/vite.hot')
        );
        Vite::prefetch(concurrency: 3);
    }
}
