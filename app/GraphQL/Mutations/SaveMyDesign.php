<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Models\CustomerDesign;
use App\Services\Customer\CustomerDesignService;

class SaveMyDesign
{
    use RequiresCustomer;

    public function __construct(private readonly CustomerDesignService $designs) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): CustomerDesign
    {
        return $this->designs->save($this->customer(), $args['input']);
    }
}
