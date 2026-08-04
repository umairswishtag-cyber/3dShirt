<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // The app is served through an HTTPS reverse proxy (for example,
        // Cloudflare Tunnel). Trust its forwarded headers so Laravel generates
        // HTTPS URLs for Ziggy, authentication, redirects, and assets.
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);
        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
            'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
            'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
            'can' => \Illuminate\Auth\Middleware\Authorize::class,
            'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
            'precognitive' => \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
            'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
            'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
            'verify.embedded' => \App\Http\Middleware\VerifyEmbedded::class,
            'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
            'customer.auth' => \App\Http\Middleware\AuthenticateCustomer::class,
            'customer.guest' => \App\Http\Middleware\RedirectIfCustomerAuthenticated::class,
            'storefront' => \App\Http\Middleware\ResolveStorefrontStore::class,
            'shopify.proxy.customer' => \App\Http\Middleware\AuthenticateShopifyProxyCustomer::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            'authenticate',
            'authenticate/*',
            'shopify/app-proxy/configurator/graphql',
            'shopify/app-proxy/configurator/production-assets/*',
            'webhook/*',
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
