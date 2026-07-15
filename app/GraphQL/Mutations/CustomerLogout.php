<?php

namespace App\GraphQL\Mutations;

use App\GraphQL\Concerns\RequiresCustomer;
use App\Services\Customer\CustomerAccountService;

class CustomerLogout
{
    use RequiresCustomer;

    public function __construct(private readonly CustomerAccountService $accounts) {}

    /** @param array<string, mixed> $args */
    public function __invoke(mixed $root, array $args): bool
    {
        $this->customer();
        $this->accounts->logout();

        return true;
    }
}
