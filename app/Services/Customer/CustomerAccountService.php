<?php

namespace App\Services\Customer;

use App\Models\Customer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use App\Services\Storefront\StorefrontContext;
use Illuminate\Validation\Rule;

class CustomerAccountService
{
    public function __construct(private readonly StorefrontContext $storefront) {}

    /** @param array<string, mixed> $input */
    public function register(array $input): Customer
    {
        $store = $this->storefront->require();
        $data = Validator::make($input, [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('customers', 'email')->where('user_id', $store->id),
            ],
            'password' => ['required', 'confirmed', Password::defaults()],
        ])->validate();

        $customer = Customer::query()->create([
            'user_id' => $store->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'auth_provider' => 'local',
        ]);

        Auth::guard('customer')->login($customer);
        request()->session()->regenerate();

        return $customer;
    }

    /** @param array<string, mixed> $input */
    public function login(array $input): Customer
    {
        $store = $this->storefront->require();
        $data = Validator::make($input, [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ])->validate();

        $customer = Customer::query()
            ->where('user_id', $store->id)
            ->where('email', strtolower($data['email']))
            ->first();

        if (! $customer || ! $customer->password || ! Hash::check($data['password'], $customer->password)) {
            throw ValidationException::withMessages([
                'email' => 'The email or password is incorrect.',
            ]);
        }

        Auth::guard('customer')->login($customer, (bool) ($data['remember'] ?? false));
        request()->session()->regenerate();

        return $customer;
    }

    public function logout(): void
    {
        Auth::guard('customer')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }
}
