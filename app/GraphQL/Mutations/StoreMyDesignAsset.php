<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\CustomerDesignAssetService;

class StoreMyDesignAsset
{
    use RequiresCustomer;

    public function __construct(private readonly CustomerDesignAssetService $assets) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): array
    {
        return $this->assets->store($this->customer(), $args['input']);
    }
}
