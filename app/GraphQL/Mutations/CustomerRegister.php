<?php

namespace App\GraphQL\Mutations;

use App\Services\Customer\CustomerAccountService;

class CustomerRegister
{
    public function __construct(private readonly CustomerAccountService $accounts) {}

    /** @param array<string, mixed> $args
     * @return array<string, mixed>
     */
    public function __invoke(mixed $root, array $args): array
    {
        return [
            'customer' => $this->accounts->register($args['input']),
            'message' => 'Your account is ready.',
        ];
    }
}
