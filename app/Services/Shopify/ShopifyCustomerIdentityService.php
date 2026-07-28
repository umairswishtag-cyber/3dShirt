<?php

namespace App\Services\Shopify;

use App\Models\Customer;
use App\Models\User;

class ShopifyCustomerIdentityService
{
    /**
     * @param array{name?: string, email?: ?string, verified_email?: bool} $profile
     */
    public function sync(User $store, string $shopifyCustomerId, array $profile = []): Customer
    {
        $gid = 'gid://shopify/Customer/'.$shopifyCustomerId;
        $providerSubject = strtolower($store->name).':'.$shopifyCustomerId;
        $profileEmail = filter_var($profile['email'] ?? null, FILTER_VALIDATE_EMAIL)
            ? strtolower((string) $profile['email'])
            : null;
        $email = $profileEmail
            ?? 'shopify-'.$shopifyCustomerId.'@customers.invalid';
        $name = trim((string) ($profile['name'] ?? ''));

        $customer = Customer::query()
            ->where('user_id', $store->id)
            ->where(function ($query) use ($gid, $providerSubject, $profileEmail): void {
                $query
                    ->where('shopify_customer_gid', $gid)
                    ->orWhere(function ($query) use ($providerSubject): void {
                        $query
                            ->where('auth_provider', 'shopify')
                            ->where('provider_subject', $providerSubject);
                    });

                if ($profileEmail) {
                    $query->orWhere('email', $profileEmail);
                }
            })
            ->first() ?? new Customer(['user_id' => $store->id]);

        $customer->fill([
            'name' => $name !== '' ? $name : 'Shopify customer',
            'email' => $email,
            'auth_provider' => 'shopify',
            'provider_subject' => $providerSubject,
            'shopify_customer_gid' => $gid,
        ]);

        if (($profile['verified_email'] ?? false) && ! $customer->email_verified_at) {
            $customer->email_verified_at = now();
        }

        $customer->save();

        return $customer;
    }
}
