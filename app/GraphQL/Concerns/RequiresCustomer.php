<?php

namespace App\GraphQL\Concerns;

use App\Models\Customer;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;

trait RequiresCustomer
{
    protected function customer(): Customer
    {
        $customer = Auth::guard('customer')->user();

        if (! $customer instanceof Customer) {
            throw new AuthenticationException('Please sign in to your customer account.');
        }

        return $customer;
    }
}
