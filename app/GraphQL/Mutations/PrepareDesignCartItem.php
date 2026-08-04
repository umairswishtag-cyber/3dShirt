<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\DesignCartService;

class PrepareDesignCartItem
{
    use RequiresCustomer;

    public function __construct(private readonly DesignCartService $cart) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): array
    {
        $customer = $this->customer();
        $item = $this->cart->prepare($customer, $args['input']);

        return [
            'id' => $item->public_id,
            'variantId' => (string) $item->shopify_variant_id,
            'quantity' => $item->quantity,
            'properties' => $this->cart->cartProperties($item->load('design')),
            'uploadUrl' => '/apps/configurator/production-assets/'.$item->public_id,
            'requestUrl' => '/apps/configurator?request_id='.$item->public_id,
        ];
    }
}
