<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\DesignCartService;
use App\Services\Storefront\StorefrontContext;

class PrepareDesignCartItem
{
    use RequiresCustomer;

    public function __construct(
        private readonly DesignCartService $cart,
        private readonly StorefrontContext $storefront,
    ) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): array
    {
        $customer = $this->customer();
        $item = $this->cart->prepare($customer, $args['input']);
        $isShopifyProxy = request()->attributes->has('shopify.customer');

        if ($isShopifyProxy) {
            $uploadUrl = '/apps/configurator/production-assets/'.$item->public_id;
            $requestUrl = '/apps/configurator?request_id='.$item->public_id;
        } else {
            $store = $this->storefront->require();
            $uploadUrl = route('store.production-assets.store', [
                'store' => $store->storefront_key,
                'id' => $item->public_id,
            ], false);
            $requestUrl = route('store.customer.requests.show', [
                'store' => $store->storefront_key,
                'id' => $item->public_id,
            ], false);
        }

        return [
            'id' => $item->public_id,
            'variantId' => (string) $item->shopify_variant_id,
            'quantity' => $item->quantity,
            'properties' => $this->cart->cartProperties($item->load('design')),
            'uploadUrl' => $uploadUrl,
            'requestUrl' => $requestUrl,
        ];
    }
}
