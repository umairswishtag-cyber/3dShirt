<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\CustomerDesignService;

class DeleteMyDesign
{
    use RequiresCustomer;

    public function __construct(private readonly CustomerDesignService $designs) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): bool
    {
        return $this->designs->delete($this->customer(), $args['id']);
    }
}
