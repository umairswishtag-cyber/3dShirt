<?php

namespace App\GraphQL\Queries;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Models\Customer;

class CustomerMe
{
    use RequiresCustomer;

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): Customer
    {
        return $this->customer();
    }
}
