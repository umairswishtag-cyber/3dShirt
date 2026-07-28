<?php

namespace App\GraphQL\Concerns;

use App\Models\Customer;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;
use App\Services\Storefront\StorefrontContext;

trait RequiresCustomer
{
    protected function customer(): Customer
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer instanceof Customer) {
            throw new AuthenticationException('Please sign in to your customer account.');
        }

        $store = app(StorefrontContext::class)->require();
        if ((int) $customer->user_id !== (int) $store->id) {
            throw new AuthenticationException('This customer account belongs to a different store.');
        }

        return $customer;
    }
}
