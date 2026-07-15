<?php

namespace App\GraphQL\Mutations;

use App\Services\Customer\CustomerAccountService;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerLogin
{
    public function __construct(private readonly CustomerAccountService $accounts) {}

    /** @param array<string, mixed> $args
     * @return array<string, mixed>
     */
    public function __invoke(mixed $root, array $args): array
    {
        $email = Str::lower((string) ($args['input']['email'] ?? ''));
        $key = 'customer-login:'.sha1($email.'|'.request()->ip());

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many login attempts. Please wait '.RateLimiter::availableIn($key).' seconds.',
            ]);
        }

        try {
            $customer = $this->accounts->login($args['input']);
            RateLimiter::clear($key);
        } catch (ValidationException $exception) {
            RateLimiter::hit($key, 60);
            throw $exception;
        }

        return ['customer' => $customer, 'message' => 'Welcome back.'];
    }
}
